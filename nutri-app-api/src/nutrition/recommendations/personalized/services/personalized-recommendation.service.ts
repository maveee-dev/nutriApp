import { BadRequestException, Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { HealthProfileService } from '../../../../health-profile/services/health-profile.service.js';
import type { HealthProfileSource } from '../../../../health-profile/types/health-profile.source.js';
import { LaboratoryReportService } from '../../../../laboratory/services/laboratory-report.service.js';
import { NutritionInsightService } from '../../../insights/nutrition-insight.service.js';
import { DailyTrackerService } from '../../../daily-tracker/services/daily-tracker.service.js';
import type { DailyNutritionLogSource } from '../../../daily-tracker/types/daily-tracker.source.js';
import type { NutritionEvaluationContext } from '../../../analysis/types/nutrition-evaluation-context.type.js';
import { NutritionTargetService } from '../../../targets/services/nutrition-target.service.js';
import { FoodsService } from '../../../foods/services/foods.service.js';
import type { FoodDetailSource } from '../../../foods/sources/food-detail.source.js';
import type { FoodSummarySource } from '../../../foods/sources/food-summary.source.js';
import { FoodEvaluationService } from '../../../evaluation/services/food-evaluation.service.js';
import type { FoodEvaluationSource } from '../../../evaluation/types/food-evaluation.type.js';
import { RecipesService } from '../../../recipes/services/recipes.service.js';
import { RecipeEvaluationService } from '../../../recipes/services/recipe-evaluation.service.js';
import { MEAL_PLANNER_MEAL_TYPES, type MealPlannerMealType } from '../../../meal-planner/types/meal-planner.type.js';
import { rankPersonalizedRecommendations, type PersonalizedRankedCandidate } from '../ranking/personalized-recommendation.ranker.js';
import type { PersonalizedRecommendationQuery } from '../types/personalized-recommendation-query.type.js';
import {
  PERSONALIZED_RECOMMENDATION_GOALS,
  type PersonalizedRecommendationBudgetItem,
  type PersonalizedRecommendationFood,
  type PersonalizedRecommendationRecipe,
  type PersonalizedRecommendationGoal,
  type PersonalizedRecommendationSource,
} from '../types/personalized-recommendation.type.js';

const CANDIDATE_POOL_LIMIT = 120;
const DEFAULT_LIMIT = 5;
const EVALUATOR_VERSION = 'food-evaluation-v3';
const HIGHLIGHT_ORDER = ['protein', 'fiber', 'sodium', 'potassium', 'phosphorus', 'calories', 'carbohydrates', 'fat', 'saturated-fat', 'added-sugar', 'cholesterol'];

@Injectable()
export class PersonalizedRecommendationService {
  constructor(
    private readonly healthProfileService: HealthProfileService,
    private readonly dailyTrackerService: DailyTrackerService,
    private readonly laboratoryReportService: LaboratoryReportService,
    private readonly nutritionTargetService: NutritionTargetService,
    private readonly foodsService: FoodsService,
    private readonly evaluationService: FoodEvaluationService,
    private readonly nutritionInsightService: NutritionInsightService,
    private readonly recipesService?: RecipesService,
    private readonly recipeEvaluationService?: RecipeEvaluationService,
  ) {}

  async recommend(userId: string, input: PersonalizedRecommendationQuery = {}): Promise<PersonalizedRecommendationSource> {
    const date = this.normalizeDate(input.date);
    const goal = this.normalizeGoal(input.goal);
    const mealType = this.normalizeMealType(input.mealType);
    const limit = Math.min(20, Math.max(1, input.limit ?? DEFAULT_LIMIT));
    const [profile, daily, latestLaboratory, laboratoryTrends, activeTargets, context, summaries] = await Promise.all([
      this.healthProfileService.get(userId),
      this.dailyTrackerService.getByDate(userId, date),
      this.laboratoryReportService.latest(userId),
      this.laboratoryReportService.trends(userId),
      this.nutritionTargetService.active(userId, this.dateAsUtc(date)),
      this.evaluationService.loadEvaluationContext(userId),
      this.foodsService.findAllForPlanning(),
    ]);

    const remainingBudget = this.toRemainingBudget(daily);
    const candidatePool = this.selectCandidateSummaries(summaries, profile, mealType, CANDIDATE_POOL_LIMIT);
    const candidates = (await Promise.all(candidatePool.map((food) => this.evaluateCandidate(userId, food.id, context, remainingBudget, goal, profile))))
      .filter((candidate): candidate is PersonalizedRankedCandidate => candidate != null);
    const ranked = rankPersonalizedRecommendations(candidates, goal, remainingBudget).slice(0, limit);
    const recommendations = ranked.map((candidate) => this.toRecommendation(candidate));
    const recipeRecommendations = await this.recipeRecommendations(userId, mealType, goal, remainingBudget, profile, limit);
    const laboratoryConsiderations = this.laboratoryConsiderations(latestLaboratory, laboratoryTrends);
    const profileConsiderations = this.profileConsiderations(profile, context.conditionCodes);
    const limitations = this.limitations(daily, profile, goal, recommendations);

    return {
      date,
      goal,
      mealType,
      recommendations,
      ...(recipeRecommendations.length === 0 ? {} : { recipeRecommendations }),
      remainingBudget,
      laboratoryConsiderations,
      profileConsiderations,
      limitations,
      provenance: {
        foodSource: 'canonical-food-database',
        selection: 'deterministic-food-evaluation-score-goal-budget-fit-and-stable-tie-breaking',
        evaluatorVersion: EVALUATOR_VERSION,
        policySetFingerprint: this.evaluationService.getPolicySetFingerprint(),
        activeTargetIds: activeTargets.map(({ id }) => id).sort(),
      },
    };
  }

  private async recipeRecommendations(
    userId: string,
    mealType: MealPlannerMealType | null,
    goal: PersonalizedRecommendationGoal,
    remainingBudget: Readonly<Record<string, PersonalizedRecommendationBudgetItem>>,
    profile: HealthProfileSource,
    limit: number,
  ): Promise<PersonalizedRecommendationRecipe[]> {
    if (this.recipesService == null || this.recipeEvaluationService == null) return [];
    const recipes = await this.recipesService.findMany(userId);
    const candidates = await Promise.all(recipes.flatMap((recipe) => recipe.versions
      .filter((version) => version.approvalStatus === 'APPROVED')
      .filter((version) => mealType == null || version.mealTypes.length === 0 || version.mealTypes.includes(mealType))
      .slice(0, 1)
      .map(async (version) => {
        const result = await this.recipeEvaluationService!.evaluate(userId, recipe.id, version.version).catch(() => null);
        if (result == null) return null;
        const evaluation = result.evaluation;
        const highlights = this.highlights(evaluation, goal);
        return {
          recipeId: recipe.id,
          recipeVersionId: version.id,
          name: version.name,
          servingName: '1 serving',
          servingGrams: result.portionGrams,
          quantity: '1',
          compatibilityScore: evaluation.score,
          coverage: evaluation.coverage,
          evaluationStatus: evaluation.evaluationStatus ?? 'evaluated',
          remainingBudgetImpact: this.budgetImpact(evaluation, remainingBudget),
          nutritionHighlights: highlights,
          whyRecommended: `${version.name}: ${this.recipeWhyRecommended(highlights, goal)} Compatibility score ${evaluation.score}/100.`,
          limitations: this.foodLimitations(evaluation, profile),
          nutritionInsights: evaluation.nutritionInsights ?? this.nutritionInsightService.generate({ evaluation }),
          evaluation,
        } satisfies PersonalizedRecommendationRecipe;
      })));
    const nonNull = candidates.filter((candidate) => candidate != null) as PersonalizedRecommendationRecipe[];
    return nonNull
      .sort((left, right) => right.compatibilityScore - left.compatibilityScore || right.coverage - left.coverage || left.name.localeCompare(right.name) || left.recipeVersionId.localeCompare(right.recipeVersionId))
      .slice(0, Math.min(3, limit));
  }

  private recipeWhyRecommended(highlights: readonly { nutrient: string; amount: string; unit: string }[], goal: PersonalizedRecommendationGoal): string {
    const highlight = highlights[0];
    if (highlight == null) return 'It was selected using the existing recipe evaluation and available nutrition guidance.';
    if (goal === 'HIGHER_PROTEIN' || goal === 'HIGHER_FIBER' || goal === 'ENERGY_SUPPORT') return `It provides ${highlight.amount} ${highlight.unit} of ${highlight.nutrient} for one recipe serving.`;
    return `It was selected using the existing recipe evaluation and available nutrition guidance.`;
  }

  private async evaluateCandidate(
    userId: string,
    foodId: string,
    context: NutritionEvaluationContext,
    remainingBudget: Readonly<Record<string, PersonalizedRecommendationBudgetItem>>,
    goal: PersonalizedRecommendationGoal,
    profile: HealthProfileSource,
  ): Promise<PersonalizedRankedCandidate | null> {
    const food = await this.foodsService.findDetailById(foodId).catch(() => null);
    if (food == null) return null;
    const serving = this.preferredServing(food);
    if (serving == null) return null;
    const result = await this.evaluationService.evaluateWithContext(userId, food.id, serving.id, '1', context).catch(() => null);
    if (result == null) return null;
    const evaluation = result.evaluation;
    const insights = evaluation.nutritionInsights ?? this.nutritionInsightService.generate({ evaluation, conditionCodes: context.conditionCodes });
    const budgetImpact = this.budgetImpact(evaluation, remainingBudget);
    const highlights = this.highlights(evaluation, goal);
    const limitations = this.foodLimitations(evaluation, profile);
    return {
      food,
      serving,
      evaluation: { ...evaluation, nutritionInsights: insights },
      budgetImpact,
      highlights,
      whyRecommended: this.whyRecommended(food, evaluation, highlights, goal),
      limitations,
    };
  }

  private selectCandidateSummaries(
    summaries: readonly FoodSummarySource[],
    profile: HealthProfileSource,
    mealType: MealPlannerMealType | null,
    limit: number,
  ): readonly FoodSummarySource[] {
    const candidates = summaries.filter((food) => this.isEligibleForMeal(food.planningClass, mealType) && !this.matchesAllergy(food, profile));
    const groups = new Map<string, FoodSummarySource[]>();
    for (const food of candidates) {
      const group = groups.get(food.category.id) ?? [];
      group.push(food);
      groups.set(food.category.id, group);
    }
    const orderedGroups = [...groups.values()].sort((left, right) => {
      const leftKey = `${left[0]?.category.name ?? ''}:${left[0]?.category.id ?? ''}`;
      const rightKey = `${right[0]?.category.name ?? ''}:${right[0]?.category.id ?? ''}`;
      return leftKey.localeCompare(rightKey);
    });
    const selected: FoodSummarySource[] = [];
    for (let offset = 0; selected.length < limit && orderedGroups.some((group) => group[offset] != null); offset += 1) {
      for (const group of orderedGroups) {
        const food = group[offset];
        if (food != null) selected.push(food);
        if (selected.length >= limit) break;
      }
    }
    return selected;
  }

  private toRecommendation(candidate: PersonalizedRankedCandidate): PersonalizedRecommendationFood {
    return {
      foodId: candidate.food.id,
      canonicalName: candidate.food.name,
      displayName: candidate.food.displayName ?? candidate.food.name,
      variantLabel: candidate.food.variantLabel ?? null,
      category: candidate.food.category.name,
      servingId: candidate.serving.id,
      servingName: candidate.serving.name,
      servingGrams: candidate.serving.grams,
      quantity: '1',
      compatibilityScore: candidate.evaluation.score,
      coverage: candidate.evaluation.coverage,
      evaluationStatus: candidate.evaluation.evaluationStatus ?? 'evaluated',
      remainingBudgetImpact: candidate.budgetImpact,
      nutritionHighlights: candidate.highlights,
      whyRecommended: candidate.whyRecommended,
      limitations: candidate.limitations,
      nutritionInsights: candidate.evaluation.nutritionInsights ?? [],
      evaluation: candidate.evaluation,
    };
  }

  private toRemainingBudget(daily: DailyNutritionLogSource): Readonly<Record<string, PersonalizedRecommendationBudgetItem>> {
    const keys = new Set([...Object.keys(daily.totals), ...Object.keys(daily.targets)]);
    return Object.fromEntries([...keys].sort().map((key) => {
      const total = daily.totals[key];
      const target = daily.targets[key];
      return [key, {
        current: target?.current ?? total?.amount ?? null,
        target: target?.target ?? null,
        remaining: target?.remaining ?? null,
        unit: target?.unit ?? total?.unit ?? this.unitFor(key),
        status: target?.status ?? 'not-configured',
      }];
    }));
  }

  private budgetImpact(evaluation: FoodEvaluationSource, remainingBudget: Readonly<Record<string, PersonalizedRecommendationBudgetItem>>) {
    return evaluation.contributions
      .map((contribution) => {
        const nutrient = this.normalizeNutrient(contribution.nutrient);
        const budget = remainingBudget[nutrient];
        const amount = contribution.amount;
        return {
          nutrient,
          amount,
          unit: contribution.unit ?? this.unitFor(nutrient),
          target: budget?.target ?? null,
          remainingBefore: budget?.remaining ?? null,
          remainingAfter: this.remainingAfter(budget?.remaining ?? null, amount, budget?.status),
          targetConfigured: budget?.target != null,
        };
      });
  }

  private remainingAfter(remaining: string | null, amount: string, status?: string): string | null {
    if (remaining == null) return null;
    try {
      const after = new Decimal(remaining).minus(amount);
      return status === 'below-target' || status === 'target-met' ? Decimal.max(after, 0).toString() : after.toString();
    } catch {
      return null;
    }
  }

  private highlights(evaluation: FoodEvaluationSource, goal: PersonalizedRecommendationGoal) {
    const priority = goal === 'HIGHER_PROTEIN' ? ['protein', ...HIGHLIGHT_ORDER]
      : goal === 'HIGHER_FIBER' ? ['fiber', ...HIGHLIGHT_ORDER]
        : goal === 'LOWER_SODIUM' ? ['sodium', ...HIGHLIGHT_ORDER]
          : goal === 'LOWER_PHOSPHORUS' ? ['phosphorus', ...HIGHLIGHT_ORDER]
            : goal === 'LOWER_POTASSIUM' ? ['potassium', ...HIGHLIGHT_ORDER]
              : goal === 'ENERGY_SUPPORT' ? ['calories', ...HIGHLIGHT_ORDER]
                : goal === 'HEART_HEALTHY' ? ['saturated-fat', 'cholesterol', ...HIGHLIGHT_ORDER]
                  : HIGHLIGHT_ORDER;
    const byNutrient = new Map(evaluation.contributions.map((contribution) => [this.normalizeNutrient(contribution.nutrient), contribution]));
    const seen = new Set<string>();
    return priority.flatMap((nutrient) => {
      if (seen.has(nutrient)) return [];
      seen.add(nutrient);
      const contribution = byNutrient.get(nutrient);
      return contribution == null ? [] : [{ nutrient, amount: contribution.amount, unit: contribution.unit ?? this.unitFor(nutrient) }];
    }).slice(0, 5);
  }

  private whyRecommended(food: FoodDetailSource, evaluation: FoodEvaluationSource, highlights: readonly { nutrient: string; amount: string; unit: string }[], goal: PersonalizedRecommendationGoal): string {
    const name = food.displayName ?? food.name;
    const highlight = highlights[0];
    const goalText: Record<PersonalizedRecommendationGoal, string> = {
      BALANCED: 'It was selected as a balanced option using the existing food evaluation and your available nutrition guidance.',
      HIGHER_PROTEIN: highlight == null ? 'It was selected using the existing food evaluation and available nutrition guidance.' : `It provides ${highlight.amount} ${highlight.unit} of ${highlight.nutrient} for the suggested serving.`,
      HIGHER_FIBER: highlight == null ? 'It was selected using the existing food evaluation and available nutrition guidance.' : `It provides ${highlight.amount} ${highlight.unit} of ${highlight.nutrient} for the suggested serving.`,
      LOWER_SODIUM: highlight == null ? 'It was selected using the existing food evaluation and available nutrition guidance.' : `It contributes ${highlight.amount} ${highlight.unit} of ${highlight.nutrient} for the suggested serving.`,
      LOWER_PHOSPHORUS: highlight == null ? 'It was selected using the existing food evaluation and available nutrition guidance.' : `It contributes ${highlight.amount} ${highlight.unit} of ${highlight.nutrient} for the suggested serving; this is a comparison, not a personal limit.`,
      LOWER_POTASSIUM: highlight == null ? 'It was selected using the existing food evaluation and available nutrition guidance.' : `It contributes ${highlight.amount} ${highlight.unit} of ${highlight.nutrient} for the suggested serving; this is a comparison, not a personal limit.`,
      ENERGY_SUPPORT: highlight == null ? 'It was selected using the existing food evaluation and available nutrition guidance.' : `It provides ${highlight.amount} ${highlight.unit} of energy for the suggested serving.`,
      HEART_HEALTHY: 'It was selected using the existing food evaluation and the available saturated-fat and cholesterol guidance.',
    };
    return `${name}: ${goalText[goal]} Compatibility score ${evaluation.score}/100.`;
  }

  private foodLimitations(evaluation: FoodEvaluationSource, profile: HealthProfileSource): readonly string[] {
    const limitations: string[] = [];
    if (evaluation.evaluationStatus === 'insufficient-evidence' || evaluation.coverage < 100) limitations.push('Some clinically relevant nutrition guidance was not included in this evaluation.');
    if (evaluation.deferredPolicies.length > 0) limitations.push(...evaluation.deferredPolicies.map(({ explanation }) => explanation));
    if (profile.medications.length > 0) limitations.push('Medication-specific food interactions are not inferred; review food and medication interactions with your healthcare professional.');
    return [...new Set(limitations)];
  }

  private limitations(daily: DailyNutritionLogSource, profile: HealthProfileSource, goal: PersonalizedRecommendationGoal, recommendations: readonly PersonalizedRecommendationFood[]): readonly string[] {
    const limitations: string[] = [];
    if (Object.values(daily.targets).some((target) => target.target == null)) limitations.push('Some nutrition targets are not configured; recommendations do not infer missing limits.');
    if (profile.medications.length > 0) limitations.push('Medication-specific food interactions are not inferred.');
    if ((goal === 'LOWER_POTASSIUM' || goal === 'LOWER_PHOSPHORUS') && daily.targets[goal === 'LOWER_POTASSIUM' ? 'potassium' : 'phosphorus']?.target == null) limitations.push(`No personalized ${goal === 'LOWER_POTASSIUM' ? 'potassium' : 'phosphorus'} target is configured; results are comparative and do not establish a personal limit.`);
    if (recommendations.length === 0) limitations.push('No eligible catalog foods with usable servings were available for this request.');
    return limitations;
  }

  private laboratoryConsiderations(latest: Awaited<ReturnType<LaboratoryReportService['latest']>>, trends: Awaited<ReturnType<LaboratoryReportService['trends']>>): readonly string[] {
    const considerations = latest.results.filter((result) => result.status !== 'normal').map(({ message }) => message);
    considerations.push(...trends.filter((trend) => trend.direction === 'worsening').map(({ testName }) => `${testName} has a worsening recorded trend. Review this result with your healthcare professional.`));
    return [...new Set(considerations)];
  }

  private profileConsiderations(profile: HealthProfileSource, conditionCodes: readonly string[]): readonly string[] {
    const conditions = profile.conditions.map(({ condition }) => condition.name);
    const considerations = conditions.length > 0 ? [`Recommendations account for your recorded conditions: ${conditions.join(', ')}.`] : ['No health conditions are currently recorded, so condition-specific guidance was not applied.'];
    if (profile.dialysis?.status === 'ACTIVE') considerations.push(`Recorded dialysis modality: ${profile.dialysis.modality}.`);
    if (conditionCodes.length === 0 && profile.conditions.length === 0) considerations.push('');
    return considerations.filter(Boolean);
  }

  private matchesAllergy(food: FoodSummarySource, profile: HealthProfileSource): boolean {
    const text = `${food.name} ${food.displayName ?? ''} ${food.variantLabel ?? ''}`.toLowerCase();
    return profile.allergies.some((allergy) => {
      const tokens = allergy.name.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
      return tokens.length > 0 && tokens.every((token) => text.includes(token));
    });
  }

  private isEligibleForMeal(planningClass: FoodDetailSource['planningClass'], mealType: MealPlannerMealType | null): boolean {
    if (planningClass === 'ALCOHOL' || planningClass === 'BEVERAGE_ONLY' || planningClass === 'CONDIMENT' || planningClass === 'INGREDIENT') return false;
    if (mealType === 'SNACK' || mealType == null) return true;
    return planningClass == null || planningClass === 'MEAL_ELIGIBLE';
  }

  private preferredServing(food: FoodDetailSource): FoodDetailSource['servings'][number] | undefined {
    return food.servings.find((serving) => !/\b(?:gram|grams|g)\b|per\s*100/i.test(serving.name)) ?? food.servings[0];
  }

  private normalizeGoal(goal?: string): PersonalizedRecommendationGoal {
    const normalized = goal?.trim().toUpperCase().replace(/[\s-]+/g, '_');
    return PERSONALIZED_RECOMMENDATION_GOALS.includes(normalized as PersonalizedRecommendationGoal) ? normalized as PersonalizedRecommendationGoal : 'BALANCED';
  }

  private normalizeMealType(mealType?: string): MealPlannerMealType | null {
    const normalized = mealType?.trim().toUpperCase();
    return MEAL_PLANNER_MEAL_TYPES.includes(normalized as MealPlannerMealType) ? normalized as MealPlannerMealType : null;
  }

  private normalizeDate(date?: string): string {
    const value = date ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('date must use YYYY-MM-DD format.');
    const parsed = this.dateAsUtc(value);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new BadRequestException('date must be a valid calendar date.');
    return value;
  }

  private dateAsUtc(date: string): Date { return new Date(`${date}T00:00:00.000Z`); }

  private normalizeNutrient(value: string): string {
    const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    if (normalized === 'energy' || normalized.includes('calorie')) return 'calories';
    if (normalized.startsWith('protein')) return 'protein';
    if (normalized.startsWith('carbohydrate')) return 'carbohydrates';
    if (normalized === 'fat' || normalized.startsWith('total lipid')) return 'fat';
    if (normalized.includes('saturated')) return 'saturated-fat';
    if (normalized.includes('added') && normalized.includes('sugar')) return 'added-sugar';
    if (normalized.includes('fiber')) return 'fiber';
    if (normalized.startsWith('sodium')) return 'sodium';
    if (normalized.startsWith('potassium')) return 'potassium';
    if (normalized.startsWith('phosphorus')) return 'phosphorus';
    if (normalized.startsWith('cholesterol')) return 'cholesterol';
    return normalized;
  }

  private unitFor(nutrient: string): string {
    return nutrient === 'calories' ? 'kcal' : ['protein', 'carbohydrates', 'fat', 'saturated-fat', 'added-sugar', 'fiber'].includes(nutrient) ? 'g' : 'mg';
  }
}
