import { Injectable, Optional } from '@nestjs/common';
import { MealEvaluationSnapshotRepository } from '../../meals/repositories/meal-evaluation-snapshot.repository.js';
import type { MealEvaluationSnapshotSource } from '../../meals/sources/meal-evaluation-snapshot.source.js';
import { HealthProfileService } from '../../health-profile/services/health-profile.service.js';
import { LaboratoryReportService } from '../../laboratory/services/laboratory-report.service.js';
import { DailyTrackerService } from '../../nutrition/daily-tracker/services/daily-tracker.service.js';
import type { DailyNutritionLogSource } from '../../nutrition/daily-tracker/types/daily-tracker.source.js';
import { NutritionAnalysisService } from '../../nutrition/analysis/services/nutrition-analysis.service.js';
import { MealPlannerService } from '../../nutrition/meal-planner/services/meal-planner.service.js';
import { RecipesService } from '../../nutrition/recipes/services/recipes.service.js';
import { RecipeEvaluationService } from '../../nutrition/recipes/services/recipe-evaluation.service.js';
import type { HealthProfileSource } from '../../health-profile/types/health-profile.source.js';
import type { HealthDashboardSource, HealthDashboardDailyFoodSource, HealthDashboardInsightSource, HealthDashboardNutrientProgressSource, HealthDashboardRecipeCardSource, HealthDashboardRecipeSummarySource } from '../types/health-dashboard.source.js';

const PROGRESS_NUTRIENTS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'carbohydrates', label: 'Carbohydrates', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
] as const;

@Injectable()
export class HealthDashboardService {
  constructor(
    private readonly healthProfileService: HealthProfileService,
    private readonly dailyTrackerService: DailyTrackerService,
    private readonly nutritionAnalysisService: NutritionAnalysisService,
    private readonly laboratoryReportService: LaboratoryReportService,
    private readonly mealPlannerService: MealPlannerService,
    private readonly snapshotRepository: MealEvaluationSnapshotRepository,
    @Optional() private readonly recipesService?: RecipesService,
    @Optional() private readonly recipeEvaluationService?: RecipeEvaluationService,
  ) {}

  async today(userId: string, email?: string): Promise<HealthDashboardSource> {
    const date = this.todayKey();
    const [profile, tracker, dailySummary, labReports, labTrends, recommendation, snapshots] = await Promise.all([
      this.healthProfileService.get(userId),
      this.dailyTrackerService.getByDate(userId, date),
      this.nutritionAnalysisService.getDailySummary(userId, date),
      this.laboratoryReportService.findMany(userId),
      this.laboratoryReportService.trends(userId),
      this.mealPlannerService.recommend(userId, { date, mealType: 'BREAKFAST', limit: 3 }).catch(() => null),
      this.snapshotRepository.findForUserDateRange(userId, this.startOfDay(date), this.startOfNextDay(date)),
    ]);

    const latestLab = labReports[0] ?? null;
    const nutritionProgress = this.progress(tracker);
    const labInsights = latestLab?.nutritionInsights ?? [];
    const healthNotices = this.notices(dailySummary.insights, dailySummary.deferredPolicies, labInsights, nutritionProgress);

    const recipeSummary = this.recipesService == null ? undefined : await this.recipes(userId, tracker);
    return {
      greeting: this.greeting(profile, email, date),
      nutritionProgress,
      nutritionInsights: dailySummary.insights,
      laboratorySummary: {
        latestReport: latestLab,
        importantResults: latestLab?.results.filter((result) => result.status !== 'normal') ?? [],
        trends: labTrends,
        insights: labInsights,
      },
      mealPlanner: {
        recommendation,
        remainingMeals: null,
      },
      dailyFoods: tracker.entries.map(this.toDailyFood),
      compatibilitySummary: this.compatibility(snapshots),
      healthNotices,
      ...(recipeSummary == null ? {} : { recipeSummary }),
    };
  }

  private async recipes(userId: string, tracker: DailyNutritionLogSource): Promise<HealthDashboardRecipeSummarySource> {
    const visible = await this.recipesService!.findMany(userId);
    const cards = visible.flatMap((recipe): HealthDashboardRecipeCardSource[] => {
      const version = recipe.versions[0];
      return version == null ? [] : [{
        recipeId: recipe.id,
        recipeVersionId: version.id,
        name: version.name,
        isFavorite: recipe.isFavorite,
        updatedAt: recipe.updatedAt,
        compatibilityScore: null,
        coverage: null,
      }];
    });
    const todayIds = new Set(tracker.entries.map((entry) => entry.recipeId).filter((id): id is string => id != null));
    const today = cards.filter((card) => todayIds.has(card.recipeId));
    const recent = cards.slice(0, 5);
    const favorites = cards.filter((card) => card.isFavorite).slice(0, 5);
    if (this.recipeEvaluationService == null) return { recent, favorites, today, recentEvaluated: [] };

    const evaluated = await Promise.all(recent.map(async (card): Promise<HealthDashboardRecipeCardSource | null> => {
      const evaluation = await this.recipeEvaluationService!.evaluate(userId, card.recipeId).catch(() => null);
      return evaluation == null ? null : { ...card, compatibilityScore: evaluation.evaluation.score, coverage: evaluation.evaluation.coverage };
    }));
    return { recent, favorites, today, recentEvaluated: evaluated.filter((card): card is HealthDashboardRecipeCardSource => card != null) };
  }

  private greeting(profile: HealthProfileSource, email: string | undefined, date: string) {
    const hour = new Date().getUTCHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return {
      greeting,
      displayName: this.displayName(email),
      date,
      profileSummary: {
        conditions: profile.conditions.map(({ condition }) => condition.name),
        dialysis: profile.dialysis == null || profile.dialysis.status !== 'ACTIVE'
          ? null
          : this.dialysisLabel(profile.dialysis.modality),
      },
    };
  }

  private progress(log: DailyNutritionLogSource): readonly HealthDashboardNutrientProgressSource[] {
    return PROGRESS_NUTRIENTS.map(({ key, label, unit }) => {
      const consumed = log.totals[key]?.amount ?? '0';
      const target = log.targets[key];
      return {
        nutrient: label,
        consumed,
        target: target?.target ?? null,
        remaining: target?.remaining ?? null,
        unit: target?.unit ?? log.totals[key]?.unit ?? unit,
        targetConfigured: target?.target != null,
        percentageConsumed: target?.percentageConsumed ?? null,
        status: target?.status ?? 'not-configured',
      };
    });
  }

  private toDailyFood(entry: DailyNutritionLogSource['entries'][number]): HealthDashboardDailyFoodSource {
    return {
      id: entry.id,
      foodId: entry.foodId,
      servingId: entry.servingId,
      recipeId: entry.recipeId,
      recipeVersionId: entry.recipeVersionId,
      displayName: entry.displayName,
      variantLabel: entry.variantLabel,
      servingName: entry.servingName,
      servingGrams: entry.servingGrams,
      quantity: entry.servings,
      compatibilityScore: null,
      evaluationStatus: 'not-available',
    };
  }

  private compatibility(snapshots: readonly MealEvaluationSnapshotSource[]) {
    const latest = new Map<string, typeof snapshots[number]>();
    for (const snapshot of snapshots) {
      const current = latest.get(snapshot.mealItemId);
      if (current == null || snapshot.evaluatedAt > current.evaluatedAt || (snapshot.evaluatedAt.getTime() === current.evaluatedAt.getTime() && snapshot.id > current.id)) latest.set(snapshot.mealItemId, snapshot);
    }
    const values = [...latest.values()];
    const insufficientEvidence = values.filter((snapshot) => snapshot.payload.evaluationStatus === 'insufficient-evidence').length;
    const evaluated = values.length - insufficientEvidence;
    const partiallyEvaluated = values.filter((snapshot) => snapshot.coverage < 100).length;
    const averageScore = evaluated === 0 ? null : Number((values.filter((snapshot) => snapshot.payload.evaluationStatus !== 'insufficient-evidence').reduce((sum, snapshot) => sum + snapshot.score, 0) / evaluated).toFixed(2));
    return { averageScore, evaluated, partiallyEvaluated, insufficientEvidence };
  }

  private notices(
    insights: readonly { ruleId: string; severity: string; explanation: string }[],
    deferrals: readonly { policyId: string; explanation: string }[],
    labInsights: readonly { category: string; severity: string; title: string; message: string }[],
    progress: readonly HealthDashboardNutrientProgressSource[],
  ): readonly HealthDashboardInsightSource[] {
    const notices: HealthDashboardInsightSource[] = [
      ...insights.map((insight) => ({ category: insight.ruleId, severity: insight.severity, title: 'Nutrition guidance', message: insight.explanation, source: 'nutrition-insight' as const })),
      ...deferrals.map((deferral) => ({ category: deferral.policyId, severity: 'warning', title: 'More information needed', message: deferral.explanation, source: 'deferred-policy' as const })),
      ...labInsights.map((insight) => ({ category: insight.category, severity: insight.severity, title: insight.title, message: insight.message, source: 'laboratory' as const })),
      ...progress.filter((item) => !item.targetConfigured).map((item) => ({ category: item.nutrient.toLowerCase(), severity: 'information', title: `${item.nutrient} target not configured`, message: `No ${item.nutrient.toLowerCase()} target is configured, so progress is shown as intake only.`, source: 'target-configuration' as const })),
    ];
    const severity = (value: string): number => value.toLowerCase().includes('warning') || value.toLowerCase().includes('high') ? 0 : value.toLowerCase().includes('information') ? 1 : 2;
    return notices.sort((left, right) => severity(left.severity) - severity(right.severity) || left.title.localeCompare(right.title) || left.message.localeCompare(right.message));
  }

  private displayName(email?: string): string {
    const local = email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
    if (!local) return 'there';
    return local.replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private dialysisLabel(modality: string): string {
    if (modality === 'PERITONEAL') return 'Peritoneal Dialysis';
    if (modality === 'HEMODIALYSIS') return 'Hemodialysis';
    return 'Active Dialysis';
  }

  private todayKey(): string { return new Date().toISOString().slice(0, 10); }
  private startOfDay(date: string): Date { return new Date(`${date}T00:00:00.000Z`); }
  private startOfNextDay(date: string): Date { const next = this.startOfDay(date); next.setUTCDate(next.getUTCDate() + 1); return next; }
}
