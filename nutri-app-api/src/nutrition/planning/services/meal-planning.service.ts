import { Injectable, Logger, Optional } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { FoodsService } from '../../foods/services/foods.service.js';
import { FoodDetailSource } from '../../foods/sources/food-detail.source.js';
import { FoodEvaluationService } from '../../evaluation/services/food-evaluation.service.js';
import { NutritionPolicyService } from '../../analysis/services/nutrition-policy.service.js';
import { DailyMealPlanResponseDto, MealPlanItemDto, MealPlanMealDto } from '../dto/daily-meal-plan-response.dto.js';
import { MealType } from '../../../../generated/prisma/client.js';
import type { FoodPlanningClass } from '../../foods/types/food-planning-class.js';
import { ShadowMealPlanningService } from '../shadow/services/shadow-meal-planning.service.js';
import { ShadowDailyAggregateEvaluationService } from '../shadow/services/shadow-daily-aggregate-evaluation.service.js';
import type { ShadowMealCandidateSource, ShadowMealPlanningResultSource } from '../shadow/types/shadow-meal-planning.source.js';
import type { ShadowMealSubstitutionSource } from '../shadow/types/shadow-meal-planning.source.js';
import type { CustomizeMealPlanDto } from '../dto/customize-meal-plan.dto.js';
import type { RecipeEvaluationSource } from '../../recipes/types/recipe-evaluation.source.js';
import type { FoodEvaluationSource } from '../../evaluation/types/food-evaluation.type.js';
import type { DailyAdherenceSource } from '../../analysis/types/daily-adherence.source.js';
import { NutritionAnalysisService } from '../../analysis/services/nutrition-analysis.service.js';
import { DailyNutritionResponseMapper } from '../../analysis/mappers/controller/daily-nutrition-response.mapper.js';

const PLAN_SLOTS = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER, MealType.SNACK] as const;
const EVALUATOR_VERSION = 'food-evaluation-v3';

interface RankedFood {
  readonly food: FoodDetailSource;
  readonly serving: FoodDetailSource['servings'][number];
  readonly evaluation: Awaited<ReturnType<FoodEvaluationService['evaluateWithContext']>>['evaluation'];
}

@Injectable()
export class MealPlanningService {
  private readonly logger = new Logger(MealPlanningService.name);

  constructor(
    private readonly foodsService: FoodsService,
    private readonly policyService: NutritionPolicyService,
    private readonly evaluationService: FoodEvaluationService,
    @Optional() private readonly shadowPlanner?: ShadowMealPlanningService,
    @Optional() private readonly dailyAggregateService?: ShadowDailyAggregateEvaluationService,
    @Optional() private readonly analysisService?: NutritionAnalysisService,
  ) {}

  async generate(userId: string, requestedDate?: string): Promise<DailyMealPlanResponseDto> {
    this.logger.debug(`[planner] userId=${userId} requestedDate=${requestedDate ?? 'default'}`);
    if (this.shadowPlanner != null) {
      const date = requestedDate ?? new Date().toISOString().slice(0, 10);
      const dailySummary = this.analysisService == null
        ? null
        : await this.analysisService.getDailySummary(userId, date);
      const shadowPlan = await this.shadowPlanner.generate(userId, requestedDate, undefined, undefined, {
        ...(dailySummary?.dailyAdherence == null ? {} : { dailyAdherence: dailySummary.dailyAdherence }),
      });
      this.logger.debug(`[planner] shadow selected=${shadowPlan.selected.length} mealTypes=${shadowPlan.selected.map(({ mealType }) => mealType).join(',') || 'none'} candidates=${shadowPlan.evaluatedCandidateCount}`);
      if (shadowPlan.selected.length > 0) {
        const dailyAggregate = this.dailyAggregateService == null
          ? null
          : (await this.dailyAggregateService.evaluate(userId, shadowPlan)).evaluation;
        this.logger.log(`[planner] final provenance=recipe-template selected=${shadowPlan.selected.map(({ mealType, templateName }) => `${mealType}:${templateName}`).join('|')}`);
        return this.toRecipeTemplatePlan(shadowPlan, dailyAggregate, dailySummary?.dailyAdherence);
      }
    }
    this.logger.warn('[planner] final provenance=food-fallback reason=shadow-plan-selected-zero');
    return this.generateFoodFallback(userId, requestedDate);
  }

  async customize(userId: string, input: CustomizeMealPlanDto): Promise<MealPlanMealDto> {
    if (this.shadowPlanner == null) throw new Error('Recipe/template planner is unavailable.');
    const candidate = await this.shadowPlanner.customize(userId, {
      templateVersionId: input.templateVersionId,
      mealType: input.mealType,
      substitutions: input.substitutions as readonly ShadowMealSubstitutionSource[],
    });
    const meal = await this.toMeal(candidate);
    return {
      ...meal,
      customization: {
        baseTemplateVersionId: input.templateVersionId,
        substitutions: input.substitutions.map(({ slotId, recipeVersionId }) => ({ slotId, recipeVersionId })),
      },
    };
  }

  /**
   * Compatibility fallback retained while recipe/template coverage is incomplete.
   * It is only selected when the active shadow planner has no valid complete meal.
   */
  private async generateFoodFallback(userId: string, requestedDate?: string): Promise<DailyMealPlanResponseDto> {
    const date = requestedDate ?? new Date().toISOString().slice(0, 10);
    const asOf = new Date(`${date}T23:59:59.999Z`);
    const loadedContext = await this.policyService.loadContext(userId, 'maintenance');
    const context = Object.freeze({ ...loadedContext, asOf });
    const targetCalculation = this.policyService.calculateFromContext(context);
    const catalog = await this.foodsService.findMany({ page: 1, limit: 40, sortBy: 'name', sortOrder: 'asc' });
    const ranked = await this.rankFoods(userId, catalog.items.map(({ id }) => id), context);
    const selected = this.selectSlots(ranked);

    return {
      apiVersion: 'v1',
      date,
      asOf: asOf.toISOString(),
      items: selected.map(({ mealType, rankedFood }) => this.toItem(mealType, rankedFood)),
      targets: { ...targetCalculation.targets },
      ...(targetCalculation.targetProvenance == null ? {} : { targetProvenance: targetCalculation.targetProvenance }),
      deferredPolicies: targetCalculation.deferredPolicies,
      policySetFingerprint: this.evaluationService.getPolicySetFingerprint(),
      provenance: {
        foodSource: 'canonical-food-database',
        selection: 'deterministic-score-descending-name-ascending-with-category-diversity',
        evaluatorVersion: EVALUATOR_VERSION,
        planner: 'food-fallback',
      },
      limitations: [
        'Suggestions use the active deterministic nutrition policies and canonical food data.',
        'Preferences, budget, allergies, and meal timing are not currently modeled and are not inferred.',
        ...(targetCalculation.deferredPolicies.length > 0 ? ['Some targets are deferred because required evidence is missing, stale, or outside the approved policy scope.'] : []),
      ],
    };
  }

  private async toRecipeTemplatePlan(shadowPlan: ShadowMealPlanningResultSource, dailyAggregate: RecipeEvaluationSource | null, dailyAdherence?: DailyAdherenceSource): Promise<DailyMealPlanResponseDto> {
    const meals = await Promise.all(shadowPlan.selected.map((candidate) => this.toMeal(candidate)));
    const firstEvaluation = shadowPlan.selected[0]?.evaluation;
    const targetCalculation = dailyAggregate?.targetCalculation ?? firstEvaluation?.targetCalculation;
    const policySetFingerprint = dailyAggregate?.provenance.policySetFingerprint ?? shadowPlan.provenance.policySetFingerprints.find((value): value is string => value != null) ?? null;
    return {
      apiVersion: 'v1',
      date: shadowPlan.date,
      asOf: shadowPlan.asOf,
      items: meals.flatMap(({ components }) => components),
      meals,
      ...(dailyAggregate == null ? {} : { dailyEvaluation: this.toEvaluation(dailyAggregate.evaluation) }),
      ...(dailyAggregate?.mealAssessment == null ? {} : { dailyMealAssessment: DailyNutritionResponseMapper.toMealAssessmentDto(dailyAggregate.mealAssessment) }),
      ...(dailyAdherence == null ? {} : {
        dailyAdherence: {
          ...dailyAdherence,
          ...(dailyAdherence.targetProvenance == null ? {} : { targetProvenance: { ...dailyAdherence.targetProvenance } }),
          ...(dailyAdherence.deferredPolicy == null ? {} : { deferredPolicy: { ...dailyAdherence.deferredPolicy } }),
          snapshotIds: [...dailyAdherence.snapshotIds],
        },
      }),
      targets: targetCalculation?.targets ?? {},
      ...(targetCalculation?.targetProvenance == null ? {} : { targetProvenance: targetCalculation.targetProvenance }),
      deferredPolicies: targetCalculation?.deferredPolicies ?? [],
      policySetFingerprint,
      provenance: {
        foodSource: 'canonical-food-database',
        selection: 'deterministic-recipe-template-score-descending-with-stable-tie-breaking',
        evaluatorVersion: firstEvaluation?.provenance.evaluatorVersion ?? EVALUATOR_VERSION,
        planner: 'recipe-template',
      },
      limitations: [
        'Meal nutrition is calculated from canonical Food data through the deterministic evaluation engine.',
        'Recipe and template versions are immutable planning inputs; current canonical Food data remains the nutrient source.',
        ...(targetCalculation?.deferredPolicies.length ? ['Some targets are deferred because required evidence is missing, stale, or outside the approved policy scope.'] : []),
      ],
    };
  }

  private async toMeal(candidate: ShadowMealCandidateSource): Promise<MealPlanMealDto> {
    return {
      mealType: candidate.mealType as MealPlanMealDto['mealType'],
      name: candidate.templateName,
      templateId: candidate.templateId,
      templateVersionId: candidate.templateVersionId,
      templateVersion: candidate.templateVersion,
      recipeVersionIds: candidate.resolvedSources.filter(({ source }) => source === 'recipe').map(({ sourceId }) => sourceId),
      recipes: candidate.resolvedSources
        .filter(({ source }) => source === 'recipe')
        .map(({ recipeId, sourceId, recipeVersion, label }) => ({
          recipeId: recipeId ?? null,
          recipeVersionId: sourceId,
          recipeVersion: recipeVersion ?? null,
          name: label,
        })),
      slotSelections: candidate.resolvedSources.map(({ slotId, source, sourceId, label, role }) => ({ slotId, source, sourceId, label, role })),
      components: await Promise.all(candidate.evaluation.components.map(async (evaluated) => {
        const component = candidate.components.find(({ id }) => id === evaluated.componentId);
        // Recipe components evaluated in grams may not carry a serving
        // reference. Resolve the deterministic first canonical serving so the
        // returned component can be submitted directly to meal logging.
        const food = evaluated.servingId == null && component?.servingId == null
          ? await this.foodsService.findDetailById(evaluated.foodId).catch(() => null)
          : null;
        const fallbackServing = food?.servings[0];
        const servingId = evaluated.servingId ?? component?.servingId ?? fallbackServing?.id ?? '';
        const servingGrams = component?.servingGrams ?? fallbackServing?.grams ?? evaluated.portionGrams;
        const quantity = evaluated.unit === 'GRAM' && servingId !== '' && servingGrams !== ''
          ? new Decimal(evaluated.quantity).div(servingGrams).toString()
          : evaluated.quantity;
        return {
          mealType: candidate.mealType as MealPlanItemDto['mealType'],
          foodId: evaluated.foodId,
          foodName: component?.foodName ?? evaluated.foodId,
          foodDisplayName: component?.foodDisplayName ?? component?.foodName ?? evaluated.foodId,
          foodVariantLabel: component?.foodVariantLabel ?? null,
          servingId,
          servingName: component?.servingName ?? fallbackServing?.name ?? evaluated.unit,
          servingGrams,
          quantity,
          category: component?.role ?? 'COMPONENT',
          evaluation: this.toEvaluation(evaluated.evaluation),
        };
      })),
      evaluation: this.toEvaluation(candidate.evaluation.evaluation),
      ...(candidate.evaluation.mealAssessment == null ? {} : {
        mealAssessment: DailyNutritionResponseMapper.toMealAssessmentDto(candidate.evaluation.mealAssessment),
      }),
      provenance: {
        ...candidate.templateProvenance,
        evaluatorVersion: candidate.evaluation.provenance.evaluatorVersion,
        policySetFingerprint: candidate.evaluation.provenance.policySetFingerprint,
        evaluationFingerprint: candidate.evaluation.provenance.recipeFingerprint,
      },
    };
  }

  private toEvaluation(evaluation: FoodEvaluationSource): MealPlanItemDto['evaluation'] {
    return {
      score: evaluation.score,
      evaluationStatus: evaluation.evaluationStatus ?? 'evaluated',
      coverage: evaluation.coverage,
      reasons: evaluation.reasons,
      contributions: evaluation.contributions,
    };
  }

  private async rankFoods(userId: string, foodIds: readonly string[], context: Parameters<FoodEvaluationService['evaluateWithContext']>[4]): Promise<RankedFood[]> {
    const ranked: RankedFood[] = [];
    for (const foodId of foodIds) {
      const food = await this.foodsService.findDetailById(foodId).catch(() => null);
      const serving = food?.servings[0];
      if (food == null || serving == null) continue;
      const result = await this.evaluationService.evaluateWithContext(userId, food.id, serving.id, '1', context);
      ranked.push({ food, serving, evaluation: result.evaluation });
    }
    return ranked.sort((left, right) => right.evaluation.score - left.evaluation.score || left.food.name.localeCompare(right.food.name) || left.food.id.localeCompare(right.food.id));
  }

  private selectSlots(ranked: readonly RankedFood[]): readonly { mealType: typeof PLAN_SLOTS[number]; rankedFood: RankedFood }[] {
    const selected: { mealType: typeof PLAN_SLOTS[number]; rankedFood: RankedFood }[] = [];
    const usedCategories = new Set<string>();
    for (const mealType of PLAN_SLOTS) {
      const unused = ranked.filter(({ food }) =>
        !selected.some(({ rankedFood }) => rankedFood.food.id === food.id) &&
        this.isEligibleForSlot(food.planningClass, mealType),
      );
      const next = unused.find(({ food }) => !usedCategories.has(food.category.name)) ?? unused[0];
      if (next == null) continue;
      selected.push({ mealType, rankedFood: next });
      usedCategories.add(next.food.category.name);
    }
    return selected;
  }

  private isEligibleForSlot(planningClass: FoodPlanningClass | undefined, mealType: typeof PLAN_SLOTS[number]): boolean {
    if (planningClass == null || planningClass === 'MEAL_ELIGIBLE') return true;
    return (planningClass === 'SNACK' || planningClass === 'DESSERT') && mealType === MealType.SNACK;
  }

  private toItem(mealType: typeof PLAN_SLOTS[number], ranked: RankedFood): MealPlanItemDto {
    return {
      mealType,
      foodId: ranked.food.id,
      foodName: ranked.food.name,
      foodDisplayName: ranked.food.displayName ?? ranked.food.name,
      foodVariantLabel: ranked.food.variantLabel ?? null,
      servingId: ranked.serving.id,
      servingName: ranked.serving.name,
      servingGrams: ranked.serving.grams,
      quantity: '1',
      category: ranked.food.category.name,
      evaluation: {
        score: ranked.evaluation.score,
        evaluationStatus: ranked.evaluation.evaluationStatus ?? 'evaluated',
        coverage: ranked.evaluation.coverage,
        reasons: ranked.evaluation.reasons,
        contributions: ranked.evaluation.contributions,
      },
    };
  }
}
