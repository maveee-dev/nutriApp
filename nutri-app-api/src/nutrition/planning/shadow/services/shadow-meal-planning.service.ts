import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { MealTemplateSlotRole, RecipeComponentRole, RecipeQuantityUnit } from '../../../../../generated/prisma/client.js';
import { FoodsService } from '../../../foods/services/foods.service.js';
import type { FoodDetailSource } from '../../../foods/sources/food-detail.source.js';
import { MealTemplatesService } from '../../../meal-templates/services/meal-templates.service.js';
import type { MealTemplateSlotSource, MealTemplateSource, MealTemplateVersionSource } from '../../../meal-templates/types/meal-template.source.js';
import { RecipeEvaluationService } from '../../../recipes/services/recipe-evaluation.service.js';
import type { RecipeComponentSource, RecipeVersionSource } from '../../../recipes/types/recipe.source.js';
import { RecipesService } from '../../../recipes/services/recipes.service.js';
import { normalizeServingDisplayName } from '../../../foods/services/food-presentation.service.js';
import type { ShadowMealCandidateSource, ShadowMealPlanningContext, ShadowMealPlanningResultSource, ShadowMealSubstitutionSource } from '../types/shadow-meal-planning.source.js';
import type { ShadowPlanningInstrumentation } from './shadow-planning-instrumentation.js';

type ShadowMealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

interface ResolvedSlotCandidate {
  readonly id: string;
  readonly label: string;
  readonly source: 'recipe' | 'canonical-food';
  readonly recipeId: string | null;
  readonly recipeVersion: number | null;
  readonly yieldServings: string;
  readonly components: readonly RecipeComponentSource[];
}

interface SlotCombination {
  readonly slots: readonly { slot: MealTemplateSlotSource; candidate: ResolvedSlotCandidate }[];
  readonly slotIds: readonly string[];
}

const MAX_CANDIDATES_PER_SLOT = 4;
const MAX_COMBINATIONS_PER_TEMPLATE = 24;
const MEAL_TYPES: readonly ShadowMealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

@Injectable()
export class ShadowMealPlanningService {
  private readonly logger = new Logger(ShadowMealPlanningService.name);

  constructor(
    private readonly mealTemplatesService: MealTemplatesService,
    private readonly recipesService: RecipesService,
    private readonly foodsService: FoodsService,
    private readonly recipeEvaluationService: RecipeEvaluationService,
  ) {}

  /** Internal validation path. It is deliberately not exposed by a controller or called by production planning. */
  async generate(userId: string, requestedDate?: string, mealType?: ShadowMealType, instrumentation?: ShadowPlanningInstrumentation, planningContext?: ShadowMealPlanningContext): Promise<ShadowMealPlanningResultSource> {
    const date = requestedDate ?? new Date().toISOString().slice(0, 10);
    const asOf = new Date(`${date}T23:59:59.999Z`);
    const loadData = () => Promise.all([
      this.mealTemplatesService.findMany(userId),
      this.recipesService.findMany(userId),
      this.foodsService.findMany({ page: 1, limit: 40, sortBy: 'name', sortOrder: 'asc' }),
    ]);
    instrumentation?.increment('templateLookups');
    instrumentation?.increment('recipeLookups');
    instrumentation?.increment('canonicalFoodLookups');
    const [templates, recipes, catalog] = instrumentation == null
      ? await loadData()
      : await instrumentation.measure('databaseLoadingMs', loadData);
    this.logger.debug(`[shadow] userId=${userId} date=${date} templatesLoaded=${templates.length} recipesLoaded=${recipes.length} foodCatalogItems=${catalog.items.length}`);
    for (const template of templates) {
      this.logger.debug(`[shadow] template id=${template.id} visibility=${template.visibility} versions=${template.versions.length} names=${template.versions.map(({ name }) => name).join('|') || 'none'}`);
      for (const version of template.versions) {
        this.logger.debug(`[shadow] templateVersion id=${version.id} name=${version.name} approval=${version.approvalStatus} mealTypes=${version.mealTypes.join(',') || 'none'} slots=${version.slots.length}`);
      }
    }
    const approvedRecipes = this.approvedRecipeVersions(recipes);
    const candidates: ShadowMealCandidateSource[] = [];
    let discardedCandidates = 0;
    const types = mealType == null ? MEAL_TYPES : [mealType];

    for (const type of types) {
      for (const template of templates) {
        for (const version of template.versions) {
          const discardReasons = [
            ...(version.approvalStatus === 'APPROVED' ? [] : [`approval-status-${version.approvalStatus.toLowerCase()}`]),
            ...(version.mealTypes.includes(type) ? [] : ['meal-type-not-supported']),
          ];
          if (discardReasons.length > 0) {
            this.logger.debug(`[shadow] templateVersion discarded id=${version.id} name=${version.name} mealType=${type} reasons=${discardReasons.join(',')}`);
          }
        }
        const templateVersions = instrumentation == null
          ? this.approvedTemplateVersions(template, type)
          : await instrumentation.measure('templateSelectionMs', async () => this.approvedTemplateVersions(template, type));
        for (const version of templateVersions) {
          instrumentation?.increment('templatesEvaluated');
          this.logger.debug(`[shadow] templateVersion retained id=${version.id} name=${version.name} mealType=${type} reason=approved-and-meal-type-matched`);
          const resolve = () => this.resolveCombinations(version, type, approvedRecipes, catalog.items.map(({ id }) => id), instrumentation);
          const combinations = instrumentation == null ? await resolve() : await instrumentation.measure('slotResolutionMs', resolve);
          for (const combination of combinations) {
            const components = combination.slots.flatMap(({ candidate }) => candidate.components);
            if (components.length === 0) continue;
            instrumentation?.increment('candidateMealsGenerated');
            instrumentation?.increment('recipesEvaluated', combination.slots.filter(({ candidate }) => candidate.source === 'recipe').length);
            instrumentation?.increment('recipeComponentsEvaluated', components.length);
            instrumentation?.increment('recipeEvaluations');
            instrumentation?.increment('policyEvaluations');
            instrumentation?.increment('nutritionAggregations');
            try {
              const evaluate = () => this.recipeEvaluationService.evaluateComposition(userId, {
                recipeId: `shadow-meal:${version.id}`,
                recipeVersionId: `shadow-template-version:${version.id}`,
                recipeVersion: version.version,
                yieldServings: '1',
                components,
              });
              const evaluation = instrumentation == null ? await evaluate() : await instrumentation.measure('recipeEvaluationMs', evaluate);
              const deferred = evaluation.evaluation.deferredPolicies.length;
              const activePolicyCoverage = Object.values(evaluation.targetCalculation.targets).filter((value) => value != null).length;
              const tieBreaker = `${version.id}|${type}|${combination.slotIds.join(',')}|${evaluation.provenance.recipeFingerprint}`;
              candidates.push({
                mealType: type,
                templateId: template.id,
                templateVersionId: version.id,
                templateVersion: version.version,
                templateName: version.name,
                cuisine: version.cuisine,
                slotIds: combination.slotIds,
                resolvedSources: combination.slots.map(({ slot, candidate }) => ({
                  slotId: slot.id,
                  source: candidate.source,
                  sourceId: candidate.id,
                  label: candidate.label,
                  recipeId: candidate.recipeId,
                  recipeVersion: candidate.recipeVersion,
                  role: slot.role,
                })),
                components,
                templateProvenance: {
                  sourceType: version.sourceType,
                  sourceName: version.sourceName,
                  sourceUrl: version.sourceUrl,
                  sourceReference: version.sourceReference,
                  sourceVersion: version.sourceVersion,
                  approvalStatus: version.approvalStatus,
                },
                evaluation,
                rankInputs: {
                  clinicalEligibility: deferred === 0 ? 1 : 0,
                  mealCompleteness: 1,
                  compatibilityScore: evaluation.evaluation.score,
                  evidenceCoverage: evaluation.evaluation.coverage,
                  activePolicyCoverage,
                  evaluationStatus: evaluation.evaluation.evaluationStatus ?? 'evaluated',
                  mealAssessmentStatus: evaluation.mealAssessment?.status ?? 'insufficient-evidence',
                  mealAssessmentCoverage: evaluation.mealAssessment?.coverage ?? 0,
                  dailyAdherenceStatus: planningContext?.dailyAdherence?.status ?? 'not-applicable',
                },
                tieBreaker,
              });
            } catch (error) {
              // A malformed or unavailable canonical composition is not a valid shadow candidate.
              instrumentation?.increment('candidateMealsDiscarded');
              discardedCandidates += 1;
              this.logger.warn(`[shadow] candidate discarded templateVersion=${version.id} mealType=${type} slotIds=${combination.slotIds.join(',')} reason=${error instanceof Error ? error.message : 'unknown-evaluation-error'}`);
            }
          }
        }
      }
    }

    const rank = () => candidates.sort((left, right) => this.compare(left, right));
    const ranked = instrumentation == null ? rank() : await instrumentation.measure('rankingMs', async () => rank());
    const selected = types.flatMap((type) => ranked.find((candidate) => candidate.mealType === type) ?? []);
    this.logger.log(`[shadow] final candidatesGenerated=${candidates.length} candidatesDiscarded=${discardedCandidates} selected=${selected.map(({ mealType, templateName, evaluation }) => `${mealType}:${templateName}:score=${evaluation.evaluation.score}`).join('|') || 'none'}`);
    return {
      apiVersion: 'shadow-v1',
      userId,
      date,
      asOf: asOf.toISOString(),
      evaluatedCandidateCount: ranked.length,
      candidates: ranked,
      selected,
      ...(planningContext?.dailyAdherence == null ? {} : { dailyAdherence: planningContext.dailyAdherence }),
      provenance: {
        planner: 'recipe-template-shadow-planner',
        selection: 'deterministic-ranked-shadow-only',
        policySetFingerprints: [...new Set(ranked.map(({ evaluation }) => evaluation.provenance.policySetFingerprint))],
      },
    };
  }

  async customize(userId: string, input: { templateVersionId: string; mealType: ShadowMealType; substitutions: readonly ShadowMealSubstitutionSource[] }, planningContext?: ShadowMealPlanningContext): Promise<ShadowMealCandidateSource> {
    const [templates, recipes, catalog] = await Promise.all([
      this.mealTemplatesService.findMany(userId),
      this.recipesService.findMany(userId),
      this.foodsService.findMany({ page: 1, limit: 40, sortBy: 'name', sortOrder: 'asc' }),
    ]);
    const template = templates.find(({ versions }) => versions.some(({ id }) => id === input.templateVersionId));
    const version = template?.versions.find(({ id }) => id === input.templateVersionId);
    if (template == null || version == null || version.approvalStatus !== 'APPROVED' || !version.mealTypes.includes(input.mealType)) {
      throw new BadRequestException('The requested meal template version is unavailable for customization.');
    }
    const substitutions = new Map(input.substitutions.map((item) => [item.slotId, item.recipeVersionId]));
    const combinations = await this.resolveCombinations(version, input.mealType, this.approvedRecipeVersions(recipes), catalog.items.map(({ id }) => id), undefined, substitutions);
    const combination = combinations[0];
    if (combination == null) throw new BadRequestException('The requested meal substitution cannot resolve all required slots.');
    const components = combination.slots.flatMap(({ candidate }) => candidate.components);
    const evaluation = await this.recipeEvaluationService.evaluateComposition(userId, {
      recipeId: `customized-meal:${version.id}`,
      recipeVersionId: `customized-template-version:${version.id}`,
      recipeVersion: version.version,
      yieldServings: '1',
      components,
    });
    return {
      mealType: input.mealType,
      templateId: template.id,
      templateVersionId: version.id,
      templateVersion: version.version,
      templateName: version.name,
      cuisine: version.cuisine,
      slotIds: combination.slotIds,
      resolvedSources: combination.slots.map(({ slot, candidate }) => ({ slotId: slot.id, source: candidate.source, sourceId: candidate.id, label: candidate.label, recipeId: candidate.recipeId, recipeVersion: candidate.recipeVersion, role: slot.role })),
      components,
      templateProvenance: { sourceType: version.sourceType, sourceName: version.sourceName, sourceUrl: version.sourceUrl, sourceReference: version.sourceReference, sourceVersion: version.sourceVersion, approvalStatus: version.approvalStatus },
      evaluation,
      rankInputs: { clinicalEligibility: evaluation.evaluation.deferredPolicies.length === 0 ? 1 : 0, mealCompleteness: 1, compatibilityScore: evaluation.evaluation.score, evidenceCoverage: evaluation.evaluation.coverage, activePolicyCoverage: Object.values(evaluation.targetCalculation.targets).filter((value) => value != null).length, evaluationStatus: evaluation.evaluation.evaluationStatus ?? 'evaluated', mealAssessmentStatus: evaluation.mealAssessment?.status ?? 'insufficient-evidence', mealAssessmentCoverage: evaluation.mealAssessment?.coverage ?? 0, dailyAdherenceStatus: planningContext?.dailyAdherence?.status ?? 'not-applicable' },
      tieBreaker: `${version.id}|${input.mealType}|${combination.slotIds.join(',')}|${evaluation.provenance.recipeFingerprint}`,
    };
  }

  private approvedTemplateVersions(template: MealTemplateSource, mealType: ShadowMealType): readonly MealTemplateVersionSource[] {
    return template.versions
      .filter((version) => version.approvalStatus === 'APPROVED' && version.mealTypes.includes(mealType))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  private approvedRecipeVersions(recipes: readonly { versions: readonly RecipeVersionSource[] }[]): readonly RecipeVersionSource[] {
    return recipes.flatMap(({ versions }) => versions.filter((version) => version.approvalStatus === 'APPROVED'))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  private async resolveCombinations(
    version: MealTemplateVersionSource,
    mealType: ShadowMealType,
    recipes: readonly RecipeVersionSource[],
    foodIds: readonly string[],
    instrumentation?: ShadowPlanningInstrumentation,
    substitutions?: ReadonlyMap<string, string>,
  ): Promise<readonly SlotCombination[]> {
    const resolvedSlots: readonly { slot: MealTemplateSlotSource; candidates: readonly ResolvedSlotCandidate[] }[] = await Promise.all(
      version.slots.map(async (slot) => ({ slot, candidates: await this.resolveSlot(slot, mealType, recipes, foodIds, instrumentation, substitutions) })),
    );
    instrumentation?.max('maximumCandidatesPerSlot', resolvedSlots.reduce((maximum, { candidates }) => Math.max(maximum, candidates.length), 0));
    for (const { slot, candidates } of resolvedSlots) {
      this.logger.debug(`[shadow] slot templateVersion=${version.id} mealType=${mealType} slotId=${slot.id} name=${slot.name} role=${slot.role} required=${slot.required} candidateCount=${candidates.length} candidates=${candidates.map(({ id, label, source }) => `${source}:${id}:${label}`).join('|') || 'none'}`);
      if (slot.required && candidates.length === 0) {
        const reason = slot.kind === 'FIXED' && slot.recipeVersionId != null
          ? 'fixed-recipe-version-not-found-or-not-visible'
          : slot.allowCanonicalFoodFallback
            ? 'no-role-matching-approved-recipe-and-no-eligible-food-fallback'
            : 'no-role-matching-approved-recipe-and-food-fallback-not-permitted';
        this.logger.warn(`[shadow] required slot failed templateVersion=${version.id} mealType=${mealType} slotId=${slot.id} name=${slot.name} role=${slot.role} reason=${reason}`);
      }
    }
    if (resolvedSlots.some(({ slot, candidates }) => slot.required && candidates.length === 0)) {
      instrumentation?.increment('slotsWithoutCandidates');
      return [];
    }
    const combinations: SlotCombination[] = [];
    const visit = (index: number, slots: { slot: MealTemplateSlotSource; candidate: ResolvedSlotCandidate }[]) => {
      if (combinations.length >= MAX_COMBINATIONS_PER_TEMPLATE) return;
      if (index === resolvedSlots.length) {
        combinations.push({ slots: [...slots], slotIds: slots.map(({ slot }) => slot.id) });
        return;
      }
      const current = resolvedSlots[index];
      if (current == null) return;
      if (!current.slot.required) visit(index + 1, slots);
      for (const candidate of current.candidates) visit(index + 1, [...slots, { slot: current.slot, candidate }]);
    };
    visit(0, []);
    instrumentation?.max('maximumSlotCombinations', combinations.length);
    if (combinations.length >= MAX_COMBINATIONS_PER_TEMPLATE) instrumentation?.increment('combinationLimitHits');
    return combinations;
  }

  private async resolveSlot(slot: MealTemplateSlotSource, mealType: ShadowMealType, recipes: readonly RecipeVersionSource[], foodIds: readonly string[], instrumentation?: ShadowPlanningInstrumentation, substitutions?: ReadonlyMap<string, string>): Promise<readonly ResolvedSlotCandidate[]> {
    const replacementRecipeVersionId = substitutions?.get(slot.id);
    if (replacementRecipeVersionId != null) {
      const replacement = recipes.find(({ id }) => id === replacementRecipeVersionId);
      if (replacement == null || (replacement.mealTypes.length > 0 && !replacement.mealTypes.includes(mealType)) || !replacement.components.some(({ role }) => role === slot.role)) return [];
      return [this.recipeCandidate(slot, replacement)];
    }
    if (slot.kind === 'FIXED' && slot.recipeVersionId != null) {
      const recipe = recipes.find(({ id }) => id === slot.recipeVersionId);
      return recipe == null || slot.recipeId == null ? [] : [this.recipeCandidate(slot, recipe)];
    }
    const recipeCandidates = recipes
      .filter((recipe) => (recipe.mealTypes.length === 0 || recipe.mealTypes.includes(mealType)) && recipe.components.some(({ role }) => role === slot.role))
      .slice(0, MAX_CANDIDATES_PER_SLOT)
      .map((recipe) => this.recipeCandidate(slot, recipe));
    if (recipeCandidates.length > 0) return recipeCandidates;
    if (!slot.allowCanonicalFoodFallback) return [];
    const selectedFoodIds = slot.foodId == null ? foodIds : [slot.foodId];
    const results: ResolvedSlotCandidate[] = [];
    for (const foodId of selectedFoodIds.slice(0, MAX_CANDIDATES_PER_SLOT)) {
      instrumentation?.increment('canonicalFoodLookups');
      const food = await this.foodsService.findDetailById(foodId).catch(() => null);
      if (food == null) continue;
      if (!this.isEligibleFallback(food, slot.role)) {
        instrumentation?.increment('disallowedFallbacks');
        continue;
      }
      instrumentation?.increment('servingLookups');
      results.push(this.foodCandidate(slot, food));
    }
    return results;
  }

  private recipeCandidate(slot: MealTemplateSlotSource, recipe: RecipeVersionSource): ResolvedSlotCandidate {
    return {
      id: recipe.id,
      label: recipe.name,
      source: 'recipe',
      recipeId: recipe.recipeId ?? null,
      recipeVersion: recipe.version,
      yieldServings: recipe.yieldServings,
      components: recipe.components.map((component) => ({ ...component, id: `${slot.id}:${component.id}` })),
    };
  }

  private foodCandidate(slot: MealTemplateSlotSource, food: FoodDetailSource): ResolvedSlotCandidate {
    const serving = food.servings.find(({ id }) => id === slot.servingId) ?? food.servings[0];
    const unit: RecipeQuantityUnit = slot.unit ?? (serving == null ? 'GRAM' : 'SERVING');
    // Keep the canonical serving identity even when the slot is evaluated in
    // grams. Evaluation still uses the gram quantity, while meal logging
    // requires a valid Serving UUID.
    const servingId = serving?.id ?? null;
    const quantity = slot.quantity ?? (unit === 'GRAM' ? '100' : '1');
    return {
      id: `food:${food.id}:${servingId ?? unit}`,
      label: food.displayName ?? food.name,
      source: 'canonical-food',
      recipeId: null,
      recipeVersion: null,
      yieldServings: '1',
      components: [{
        id: `${slot.id}:food:${food.id}`,
        foodId: food.id,
        foodName: food.name,
        foodDisplayName: food.displayName ?? food.name,
        foodVariantLabel: food.variantLabel ?? null,
        servingId,
        servingName: serving == null ? null : normalizeServingDisplayName(serving.name, food.displayName ?? food.name),
        servingGrams: serving?.grams ?? null,
        role: slot.role as RecipeComponentRole,
        quantity,
        unit,
        displayOrder: slot.displayOrder,
        notes: slot.notes,
      }],
    };
  }

  private isEligibleFallback(food: FoodDetailSource, role: MealTemplateSlotRole): boolean {
    if (food.planningClass === 'ALCOHOL' || food.planningClass === 'CONDIMENT' || food.planningClass === 'INGREDIENT') return false;
    if (role === 'DRINK') return food.planningClass === 'BEVERAGE_ONLY';
    return food.planningClass == null || food.planningClass === 'MEAL_ELIGIBLE' || food.planningClass === 'SNACK' || food.planningClass === 'DESSERT';
  }

  private compare(left: ShadowMealCandidateSource, right: ShadowMealCandidateSource): number {
    const leftEvidence = left.rankInputs.evaluationStatus === 'insufficient-evidence' ? 0 : 1;
    const rightEvidence = right.rankInputs.evaluationStatus === 'insufficient-evidence' ? 0 : 1;
    if (rightEvidence !== leftEvidence) return rightEvidence - leftEvidence;
    const fields: (keyof Omit<ShadowMealCandidateSource['rankInputs'], 'evaluationStatus' | 'mealAssessmentStatus' | 'mealAssessmentCoverage' | 'dailyAdherenceStatus'>)[] = ['clinicalEligibility', 'compatibilityScore', 'mealCompleteness', 'evidenceCoverage', 'activePolicyCoverage'];
    for (const field of fields) {
      const difference = right.rankInputs[field] - left.rankInputs[field];
      if (difference !== 0) return difference;
    }
    const leftMealAssessment = left.rankInputs.mealAssessmentStatus === 'evaluated' ? 1 : 0;
    const rightMealAssessment = right.rankInputs.mealAssessmentStatus === 'evaluated' ? 1 : 0;
    if (rightMealAssessment !== leftMealAssessment) return rightMealAssessment - leftMealAssessment;
    const mealAssessmentCoverageDifference = (right.rankInputs.mealAssessmentCoverage ?? 0) - (left.rankInputs.mealAssessmentCoverage ?? 0);
    if (mealAssessmentCoverageDifference !== 0) return mealAssessmentCoverageDifference;
    return left.tieBreaker.localeCompare(right.tieBreaker);
  }
}
