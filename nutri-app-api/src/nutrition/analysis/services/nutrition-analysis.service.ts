import { Inject, Injectable } from '@nestjs/common';
import { MealEvaluationSnapshotRepository } from '../../../meals/repositories/meal-evaluation-snapshot.repository.js';
import { NutritionAnalysisRepository } from '../repositories/nutrition-analysis.repository.js';
import { DailyNutritionSummarySource } from '../types/daily-nutrition-summary.source.js';
import { NutritionCalculator } from './nutrition-calculator.js';
import { NutritionPolicyService } from './nutrition-policy.service.js';
import { WeeklyNutritionSummarySource } from '../types/daily-nutrition-summary.source.js';
import { Decimal } from 'decimal.js';
import { DailyNutritionProjectionRegistration } from '../types/daily-nutrition-projection.type.js';
import { DAILY_NUTRITION_PROJECTION_REGISTRATIONS } from './daily-nutrition-projection.tokens.js';
import { createDailyNutritionProjectionRegistrations } from './daily-nutrition-projection-registrations.js';
import { decodeMealEvaluationSnapshot } from '../../../meals/snapshots/meal-evaluation-snapshot.adapter.js';

@Injectable()
export class NutritionAnalysisService {
  constructor(
    private readonly repository: NutritionAnalysisRepository,
    private readonly calculator: NutritionCalculator,
    private readonly policyService: NutritionPolicyService,
    @Inject(MealEvaluationSnapshotRepository)
    private readonly snapshotRepository: Pick<MealEvaluationSnapshotRepository, 'findForUserDateRange'> = {
      findForUserDateRange: async () => [],
    },
    @Inject(DAILY_NUTRITION_PROJECTION_REGISTRATIONS)
    private readonly projectionRegistrations: readonly DailyNutritionProjectionRegistration[] = createDailyNutritionProjectionRegistrations(),
  ) {}

  async getDailySummary(userId: string, date: string): Promise<DailyNutritionSummarySource> {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const meals = await this.repository.findMealsForDateRange(userId, start, end);

    const targetCalculation = await this.policyService.calculateForUser(userId);
    const snapshots = await this.snapshotRepository.findForUserDateRange(userId, start, end);
    return this.buildDailySummary(date, meals, targetCalculation, snapshots);
  }

  async getWeeklySummary(userId: string, startDate: string): Promise<WeeklyNutritionSummarySource> {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const meals = await this.repository.findMealsForDateRange(userId, start, end);
    const targetCalculation = await this.policyService.calculateForUser(userId);
    const snapshots = await this.snapshotRepository.findForUserDateRange(userId, start, end);
    const days: DailyNutritionSummarySource[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(start);
      day.setUTCDate(day.getUTCDate() + offset);
      const date = day.toISOString().slice(0, 10);
      days.push(this.buildDailySummary(
        date,
        meals.filter((meal) => meal.consumedAt.toISOString().slice(0, 10) === date),
        targetCalculation,
        snapshots.filter((snapshot) => snapshot.evaluatedAt.toISOString().slice(0, 10) === date),
      ));
    }
    return { startDate, endDate: new Date(end.getTime() - 1).toISOString().slice(0, 10), days };
  }

  /**
   * Replays historical days from the immutable evaluation snapshots captured
   * at meal-entry time. Current profile/policy state is deliberately not used
   * for this path, so old recommendations cannot silently change after a
   * policy or profile update.
   */
  async getHistoricalSummary(userId: string, startDate: string): Promise<WeeklyNutritionSummarySource> {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const meals = await this.repository.findMealsForDateRange(userId, start, end);
    const snapshots = await this.snapshotRepository.findForUserDateRange(userId, start, end);
    const days: DailyNutritionSummarySource[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(start);
      day.setUTCDate(day.getUTCDate() + offset);
      const date = day.toISOString().slice(0, 10);
      const dayMeals = meals.filter((meal) => meal.consumedAt.toISOString().slice(0, 10) === date);
      const daySnapshots = snapshots.filter((snapshot) => snapshot.evaluatedAt.toISOString().slice(0, 10) === date);
      const targetCalculation = this.replayTargetCalculation(daySnapshots);
      days.push(this.buildDailySummary(date, dayMeals, targetCalculation, daySnapshots, true));
    }
    return { startDate, endDate: new Date(end.getTime() - 1).toISOString().slice(0, 10), days };
  }

  private buildDailySummary(
    date: string,
    meals: Awaited<ReturnType<NutritionAnalysisRepository['findMealsForDateRange']>>,
    targetCalculation: Awaited<ReturnType<NutritionPolicyService['calculateForUser']>>,
    snapshots: Awaited<ReturnType<MealEvaluationSnapshotRepository['findForUserDateRange']>> = [],
    historicalReplay = false,
  ): DailyNutritionSummarySource {

    const totals = historicalReplay ? this.replayTotals(snapshots) : this.calculator.calculate(meals.flatMap((meal) => meal.items));
    const calories = this.findCalories(totals);
    const caloriesConsumedKcal = calories?.amount ?? (meals.length === 0 ? '0' : null);
    const calorieTarget = targetCalculation.targets.caloriesKcal == null
      ? null
      : new Decimal(targetCalculation.targets.caloriesKcal);
    const consumed = caloriesConsumedKcal == null ? null : new Decimal(caloriesConsumedKcal);
    const projections = this.projectionRegistrations.map((registration) => registration.project({
      date,
      meals,
      targetCalculation,
      snapshots,
      totals,
      historicalReplay,
    }));
    const mealAssessmentDeferrals = projections.flatMap((projection) => projection.mealAssessments ?? []).flatMap((assessment) => assessment.deferredPolicies);
    const deferredPolicies = uniqueDeferrals([
      ...targetCalculation.deferredPolicies,
      ...projections.flatMap((projection) => projection.deferredPolicies),
      ...mealAssessmentDeferrals,
    ]);
    const insights = projections.flatMap((projection) => projection.insights ?? []);
    const mealAssessments = projections.flatMap((projection) => projection.mealAssessments ?? []);
    const diabetesCarbohydrateAdherence = projections.find((projection) => projection.diabetesCarbohydrateAdherence != null)?.diabetesCarbohydrateAdherence;
    const dailyAdherence = projections.find((projection) => projection.dailyAdherence != null)?.dailyAdherence;
    const dailyAdherenceByPolicy = projections.flatMap((projection) => projection.dailyAdherenceByPolicy ?? []);
    const snapshotMetadata = this.snapshotMetadata(snapshots);

    return {
      date,
      mealCount: meals.length,
      totals,
      targets: targetCalculation.targets,
      insights,
      deferredPolicies,
      caloriesConsumedKcal,
      remainingCaloriesKcal: calorieTarget == null || consumed == null
        ? null
        : calorieTarget.minus(consumed).toString(),
      calorieTargetPercentage: calorieTarget == null || consumed == null || calorieTarget.isZero()
        ? null
        : new Decimal(100).mul(consumed).div(calorieTarget).toDecimalPlaces(2).toNumber(),
      ...(targetCalculation.energyGoal == null ? {} : { energyGoal: targetCalculation.energyGoal }),
      ...(targetCalculation.targetProvenance == null ? {} : { targetProvenance: targetCalculation.targetProvenance }),
      ...(diabetesCarbohydrateAdherence == null ? {} : { diabetesCarbohydrateAdherence }),
      ...(dailyAdherence == null ? {} : { dailyAdherence }),
      ...(dailyAdherenceByPolicy.length === 0 ? {} : { dailyAdherenceByPolicy }),
      ...(mealAssessments.length === 0 ? {} : { mealAssessments }),
      ...(snapshots.length === 0 ? {} : {
        snapshotIds: snapshotMetadata.snapshotIds,
        evaluatorVersions: snapshotMetadata.evaluatorVersions,
        policySetFingerprints: snapshotMetadata.policySetFingerprints,
        snapshotFingerprints: snapshotMetadata.snapshotFingerprints,
      }),
      ...(historicalReplay ? {
        evaluationMode: 'historical-replay' as const,
      } : {}),
    };
  }

  private replayTargetCalculation(snapshots: ReadonlyArray<Awaited<ReturnType<MealEvaluationSnapshotRepository['findForUserDateRange']>>[number]>): Awaited<ReturnType<NutritionPolicyService['calculateForUser']>> {
    const latest = [...snapshots].sort((left, right) => right.evaluatedAt.getTime() - left.evaluatedAt.getTime() || right.id.localeCompare(left.id))[0];
    if (latest == null) return { targets: { sodiumMilligrams: '2300', proteinGrams: null }, adjustments: [], deferredPolicies: [] };
    const payload = decodeMealEvaluationSnapshot(latest);
    const deferredPolicies = uniqueDeferrals(snapshots.flatMap((snapshot) => decodeMealEvaluationSnapshot(snapshot).deferredPolicies));
    return {
      targets: payload.targets,
      adjustments: [],
      deferredPolicies,
      ...(payload.targetProvenance == null ? {} : { targetProvenance: payload.targetProvenance }),
      ...(payload.resolvedRules == null ? {} : { resolvedRules: payload.resolvedRules }),
      ...(payload.goal == null ? {} : { energyGoal: payload.goal as never }),
    };
  }

  private replayTotals(snapshots: ReadonlyArray<Awaited<ReturnType<MealEvaluationSnapshotRepository['findForUserDateRange']>>[number]>): readonly { name: string; unit: string; amount: string }[] {
    const latest = new Map<string, Awaited<ReturnType<MealEvaluationSnapshotRepository['findForUserDateRange']>>[number]>();
    for (const snapshot of snapshots) {
      const current = latest.get(snapshot.mealItemId);
      if (current == null || snapshot.evaluatedAt > current.evaluatedAt || (snapshot.evaluatedAt.getTime() === current.evaluatedAt.getTime() && snapshot.id > current.id)) latest.set(snapshot.mealItemId, snapshot);
    }
    const totals = new Map<string, { name: string; unit: string; amount: Decimal }>();
    for (const snapshot of latest.values()) {
      for (const contribution of decodeMealEvaluationSnapshot(snapshot).contributions) {
        const key = contribution.nutrient.toLowerCase();
        const existing = totals.get(key);
        totals.set(key, { name: existing?.name ?? contribution.nutrient, unit: existing?.unit ?? this.unitForNutrient(contribution.nutrient), amount: (existing?.amount ?? new Decimal(0)).plus(contribution.amount) });
      }
    }
    return [...totals.values()].sort((left, right) => left.name.localeCompare(right.name)).map((total) => ({ name: total.name, unit: total.unit, amount: total.amount.toString() }));
  }

  private unitForNutrient(nutrient: string): string {
    return /sodium|cholesterol/i.test(nutrient) ? 'mg' : /calor/i.test(nutrient) ? 'kcal' : 'g';
  }

  private findCalories(totals: readonly { name: string; unit: string; amount: string }[]) {
    return totals.find((total) => {
      const name = total.name.trim().toLowerCase();
      return (name === 'calories' || name === 'energy') && total.unit.trim().toLowerCase() === 'kcal';
    });
  }

  private snapshotMetadata(snapshots: ReadonlyArray<Awaited<ReturnType<MealEvaluationSnapshotRepository['findForUserDateRange']>>[number]>): {
    readonly snapshotIds: readonly string[];
    readonly evaluatorVersions: readonly string[];
    readonly policySetFingerprints: readonly string[];
    readonly snapshotFingerprints: readonly string[];
  } {
    const policySetFingerprints: string[] = [];
    const snapshotFingerprints: string[] = [];
    for (const snapshot of snapshots) {
      try {
        const payload = decodeMealEvaluationSnapshot(snapshot);
        if (payload.policySetFingerprint != null) policySetFingerprints.push(payload.policySetFingerprint);
        if (payload.snapshotFingerprint != null) snapshotFingerprints.push(payload.snapshotFingerprint);
      } catch {
        // Existing snapshots remain usable through their validated legacy fields.
      }
    }
    return {
      snapshotIds: snapshots.map(({ id }) => id),
      evaluatorVersions: [...new Set(snapshots.map(({ evaluatorVersion }) => evaluatorVersion))],
      policySetFingerprints: [...new Set(policySetFingerprints)],
      snapshotFingerprints: [...new Set(snapshotFingerprints)],
    };
  }

}

function uniqueDeferrals(
  deferrals: readonly import('../types/nutrition-targets.type.js').NutritionPolicyDeferralSource[],
): readonly import('../types/nutrition-targets.type.js').NutritionPolicyDeferralSource[] {
  const seen = new Set<string>();
  return deferrals.filter((deferral) => {
    const key = JSON.stringify(deferral);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
