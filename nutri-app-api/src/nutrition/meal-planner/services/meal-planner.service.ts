import { BadRequestException, Injectable } from '@nestjs/common';
import { CanonicalCalculationKernel } from '../../calculation/index.js';
import type { FoodDetailSource } from '../../foods/sources/food-detail.source.js';
import type { FoodSummarySource } from '../../foods/sources/food-summary.source.js';
import { FoodEvaluationService } from '../../evaluation/services/food-evaluation.service.js';
import { DailyTrackerService } from '../../daily-tracker/services/daily-tracker.service.js';
import type { DailyNutritionLogSource, DailyNutritionTotalsSource } from '../../daily-tracker/types/daily-tracker.source.js';
import { MealPlannerRepository } from '../repositories/meal-planner.repository.js';
import { candidateFitsCalorieBudget, rankMealPlannerCandidates, type MealPlannerRankedCandidate } from '../ranking/meal-planner.ranker.js';
import type { MealPlannerRequestInput } from '../types/meal-planner.input.js';
import {
  MEAL_PLANNER_MEAL_TYPES,
  type MealPlannerFoodSource,
  type MealPlannerFocus,
  type MealPlannerMealType,
  type MealPlannerRemainingBudget,
  type MealPlannerResponseSource,
  type MealPlannerSummary,
} from '../types/meal-planner.type.js';
import { MealPlannerAiExplanationService } from './meal-planner-ai-explanation.service.js';
import { RecipesService } from '../../recipes/services/recipes.service.js';
import { RecipeEvaluationService } from '../../recipes/services/recipe-evaluation.service.js';

const CANDIDATE_POOL_LIMIT = 100;
const DEFAULT_FOOD_LIMIT = 3;
const EVALUATOR_VERSION = 'food-evaluation-v3';
const SUMMARY_NUTRIENTS = ['calories', 'protein', 'carbohydrates', 'fat', 'saturatedFat', 'addedSugar', 'fiber', 'sodium', 'potassium', 'phosphorus', 'cholesterol'] as const;

@Injectable()
export class MealPlannerService {
  private readonly calculationKernel = new CanonicalCalculationKernel();

  constructor(
    private readonly repository: MealPlannerRepository,
    private readonly evaluationService: FoodEvaluationService,
    private readonly dailyTrackerService: DailyTrackerService,
    private readonly aiExplanationService?: MealPlannerAiExplanationService,
    private readonly recipesService?: RecipesService,
    private readonly recipeEvaluationService?: RecipeEvaluationService,
  ) {}

  async getRemainingBudget(userId: string, requestedDate?: string): Promise<{ date: string; totals: DailyNutritionTotalsSource; nutrients: MealPlannerRemainingBudget }> {
    const date = this.normalizeDate(requestedDate);
    const daily = await this.dailyTrackerService.getByDate(userId, date);
    return { date, totals: daily.totals, nutrients: this.toRemainingBudget(daily) };
  }

  async recommend(userId: string, input: MealPlannerRequestInput = {}): Promise<MealPlannerResponseSource> {
    const date = this.normalizeDate(input.date);
    const mealType = input.mealType ?? MEAL_PLANNER_MEAL_TYPES[0];
    const focus: MealPlannerFocus = input.focus ?? 'BALANCED';
    const daily = await this.dailyTrackerService.getByDate(userId, date);
    const remainingBudget = this.toRemainingBudget(daily);
    const context = await this.evaluationService.loadEvaluationContext(userId);
    const summaries = await this.repository.findCandidateFoods();
    const candidatePool = this.selectCandidateSummaries(
      summaries.filter((food) => this.isEligibleForMeal(food.planningClass, mealType)),
      CANDIDATE_POOL_LIMIT,
    );
    const caloriesRemaining = input.caloriesRemaining ?? (focus === 'CALORIE_BUDGET' ? remainingBudget.calories?.remaining ?? undefined : undefined);
    const candidates = (await Promise.all(candidatePool
      .map((food) => this.evaluateCandidate(userId, food.id, context))))
      .filter((candidate): candidate is MealPlannerRankedCandidate => candidate != null)
      .filter((candidate) => candidateFitsCalorieBudget(candidate, caloriesRemaining));
    const ranked = rankMealPlannerCandidates(candidates, focus, remainingBudget);
    const selected = this.selectMealFoods(ranked, input.limit ?? DEFAULT_FOOD_LIMIT);
    const foods = selected.map((candidate) => this.toFoodSource(candidate));
    const source: MealPlannerResponseSource = {
      date,
      mealType,
      focus,
      foods,
      summary: this.toSummary(foods),
      remainingBudget,
      limitations: this.limitations(daily, foods, input.caloriesRemaining),
      provenance: {
        foodSource: 'canonical-food-database',
        selection: 'deterministic-food-evaluation-score-budget-fit-focus-and-stable-tie-breaking',
        evaluatorVersion: EVALUATOR_VERSION,
        policySetFingerprint: this.evaluationService.getPolicySetFingerprint(),
      },
    };
    const recipes = await this.recipeRecommendations(userId, mealType, context);
    if (recipes.length > 0) (source as { recipes?: typeof recipes }).recipes = recipes;
    if (input.includeExplanation && this.aiExplanationService != null) {
      const aiExplanation = await this.aiExplanationService.explain(source);
      return aiExplanation == null ? source : { ...source, aiExplanation };
    }
    return source;
  }

  private async recipeRecommendations(
    userId: string,
    mealType: MealPlannerMealType,
    context: Parameters<FoodEvaluationService['evaluateWithContext']>[4],
  ): Promise<NonNullable<MealPlannerResponseSource['recipes']>> {
    if (this.recipesService == null || this.recipeEvaluationService == null) return [];
    const recipes = await this.recipesService.findMany(userId);
    const evaluated = await Promise.all(recipes.flatMap((recipe) => recipe.versions
      .filter((version) => version.approvalStatus === 'APPROVED')
      .filter((version) => version.mealTypes.length === 0 || version.mealTypes.includes(mealType))
      .slice(0, 1)
      .map(async (version) => {
        const result = await this.recipeEvaluationService!.evaluate(userId, recipe.id, version.version).catch(() => null);
        if (result == null) return null;
        const evaluation = result.evaluation;
        return {
          recipeId: recipe.id,
          recipeVersionId: version.id,
          name: version.name,
          servingName: '1 serving',
          servingGrams: result.portionGrams,
          quantity: '1',
          score: evaluation.score,
          coverage: evaluation.coverage,
          evaluationStatus: evaluation.evaluationStatus ?? 'evaluated',
          keyNutrients: evaluation.contributions.map((contribution) => ({ nutrient: contribution.nutrient, amount: contribution.amount, unit: contribution.unit ?? this.unitFor(contribution.nutrient) })),
          evaluation,
          nutritionInsights: evaluation.nutritionInsights ?? [],
        };
      })));
    return evaluated.filter((item): item is NonNullable<typeof item> => item != null)
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name) || left.recipeVersionId.localeCompare(right.recipeVersionId))
      .slice(0, 3);
  }

  private async evaluateCandidate(
    userId: string,
    foodId: string,
    context: Parameters<FoodEvaluationService['evaluateWithContext']>[4],
  ): Promise<MealPlannerRankedCandidate | null> {
    const food = await this.repository.findFoodById(foodId).catch(() => null);
    if (food == null) return null;
    const serving = this.preferredServing(food);
    if (serving == null) return null;
    const result = await this.evaluationService.evaluateWithContext(userId, food.id, serving.id, '1', context).catch(() => null);
    if (result == null) return null;
    return { food, serving, evaluation: result.evaluation };
  }

  private preferredServing(food: FoodDetailSource): FoodDetailSource['servings'][number] | undefined {
    const household = food.servings.find((serving) => !/\b(?:gram|grams|g)\b|per\s*100/i.test(serving.name));
    return household ?? food.servings[0];
  }

  private selectMealFoods(ranked: readonly MealPlannerRankedCandidate[], requestedLimit: number): readonly MealPlannerRankedCandidate[] {
    const limit = Math.min(10, Math.max(1, requestedLimit));
    const selected: MealPlannerRankedCandidate[] = [];
    const categories = new Set<string>();
    for (const candidate of ranked) {
      if (selected.length >= limit) break;
      if (categories.has(candidate.food.category.name)) continue;
      selected.push(candidate);
      categories.add(candidate.food.category.name);
    }
    if (selected.length < limit) {
      for (const candidate of ranked) {
        if (selected.length >= limit) break;
        if (!selected.some(({ food }) => food.id === candidate.food.id)) selected.push(candidate);
      }
    }
    return selected;
  }

  private selectCandidateSummaries(summaries: readonly FoodSummarySource[], limit: number): readonly FoodSummarySource[] {
    const groups = new Map<string, FoodSummarySource[]>();
    for (const food of summaries) {
      const group = groups.get(food.category.id) ?? [];
      group.push(food);
      groups.set(food.category.id, group);
    }
    const categoryGroups = [...groups.entries()].sort(([, leftFoods], [, rightFoods]) => {
      const leftName = leftFoods[0]?.category.name ?? '';
      const rightName = rightFoods[0]?.category.name ?? '';
      const categoryName = leftName.localeCompare(rightName);
      return categoryName !== 0 ? categoryName : (leftFoods[0]?.category.id ?? '').localeCompare(rightFoods[0]?.category.id ?? '');
    });
    const selected: FoodSummarySource[] = [];
    let offset = 0;
    while (selected.length < limit && categoryGroups.some(([, foods]) => offset < foods.length)) {
      for (const [, foods] of categoryGroups) {
        const food = foods[offset];
        if (food != null) selected.push(food);
        if (selected.length >= limit) break;
      }
      offset += 1;
    }
    return selected;
  }

  private toFoodSource(candidate: MealPlannerRankedCandidate): MealPlannerFoodSource {
    return {
      foodId: candidate.food.id,
      name: candidate.food.name,
      displayName: candidate.food.displayName ?? candidate.food.name,
      variantLabel: candidate.food.variantLabel ?? null,
      servingId: candidate.serving.id,
      servingName: candidate.serving.name,
      servingGrams: candidate.serving.grams,
      quantity: '1',
      score: candidate.evaluation.score,
      coverage: candidate.evaluation.coverage,
      evaluationStatus: candidate.evaluation.evaluationStatus ?? 'evaluated',
      keyNutrients: candidate.evaluation.contributions.map((contribution) => ({
        nutrient: this.summaryKey(contribution.nutrient),
        amount: contribution.amount,
        unit: contribution.unit ?? this.unitFor(this.summaryKey(contribution.nutrient)),
      })),
      evaluation: candidate.evaluation,
      nutritionInsights: candidate.evaluation.nutritionInsights ?? [],
      category: candidate.food.category.name,
    };
  }

  private toSummary(foods: readonly MealPlannerFoodSource[]): MealPlannerSummary {
    const aggregated = this.calculationKernel.aggregateContributions(
      foods.flatMap((food) => food.keyNutrients.map((nutrient) => ({
        nutrientKey: nutrient.nutrient,
        name: nutrient.nutrient,
        unit: nutrient.unit,
        amount: nutrient.amount,
      }))),
    );
    const summary: Record<string, { amount: string; unit: string }> = {};
    for (const contribution of aggregated.contributions) {
      const key = this.summaryKey(contribution.nutrientKey);
      if (!SUMMARY_NUTRIENTS.includes(key as (typeof SUMMARY_NUTRIENTS)[number])) continue;
      summary[key] = { amount: contribution.amount, unit: contribution.unit };
    }
    return summary;
  }

  private toRemainingBudget(daily: DailyNutritionLogSource): MealPlannerRemainingBudget {
    const keys = new Set([...Object.keys(daily.totals), ...Object.keys(daily.targets)]);
    const result: Record<string, { current: string | null; target: string | null; remaining: string | null; unit: string; status: string }> = {};
    for (const key of keys) {
      const total = daily.totals[key];
      const target = daily.targets[key];
      result[key] = {
        current: target?.current ?? total?.amount ?? null,
        target: target?.target ?? null,
        remaining: target?.remaining ?? null,
        unit: target?.unit ?? total?.unit ?? this.unitFor(key),
        status: target?.status ?? 'not-configured',
      };
    }
    return result;
  }

  private limitations(daily: DailyNutritionLogSource, foods: readonly MealPlannerFoodSource[], caloriesRemaining?: string): readonly string[] {
    const limitations: string[] = [];
    if (Object.values(daily.targets).some((target) => target.target == null)) limitations.push('Some nutrition targets are not configured; the planner does not infer missing limits.');
    if (foods.some((food) => food.evaluationStatus === 'insufficient-evidence')) limitations.push('Some selected foods have incomplete compatibility coverage and should be reviewed with the available guidance.');
    if (caloriesRemaining != null && foods.length === 0) limitations.push('No catalog foods with known calories fit the requested calorie budget.');
    if (foods.length === 0 && limitations.length === 0) limitations.push('No eligible catalog foods with usable servings were available for this meal.');
    return limitations;
  }

  private isEligibleForMeal(planningClass: FoodDetailSource['planningClass'], mealType: MealPlannerMealType): boolean {
    if (planningClass === 'ALCOHOL' || planningClass === 'BEVERAGE_ONLY' || planningClass === 'CONDIMENT' || planningClass === 'INGREDIENT') return false;
    if (mealType === 'SNACK') return true;
    return planningClass == null || planningClass === 'MEAL_ELIGIBLE';
  }

  private summaryKey(nutrient: string): string {
    const normalized = nutrient.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    if (normalized === 'energy' || normalized.includes('calorie')) return 'calories';
    if (normalized.startsWith('protein')) return 'protein';
    if (normalized.startsWith('carbohydrate')) return 'carbohydrates';
    if (normalized === 'fat' || normalized.startsWith('total lipid')) return 'fat';
    if (normalized.includes('saturated')) return 'saturatedFat';
    if (normalized.includes('added') && normalized.includes('sugar')) return 'addedSugar';
    if (normalized.includes('fiber')) return 'fiber';
    if (normalized.startsWith('sodium')) return 'sodium';
    if (normalized.startsWith('potassium')) return 'potassium';
    if (normalized.startsWith('phosphorus')) return 'phosphorus';
    if (normalized.startsWith('cholesterol')) return 'cholesterol';
    return normalized.replace(/\s+(.)/g, (_match, character: string) => character.toUpperCase());
  }

  private unitFor(nutrient: string): string {
    return nutrient === 'calories' ? 'kcal' : nutrient === 'protein' || nutrient === 'carbohydrates' || nutrient === 'fat' || nutrient === 'saturatedFat' || nutrient === 'addedSugar' || nutrient === 'fiber' ? 'g' : 'mg';
  }

  private normalizeDate(date?: string): string {
    const value = date ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('date must use YYYY-MM-DD format.');
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new BadRequestException('date must be a valid calendar date.');
    return value;
  }
}
