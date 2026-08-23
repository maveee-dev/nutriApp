import { createHash } from 'node:crypto';
import { DiabetesCarbohydrateAdherencePolicy, DiabetesCarbohydrateAdherenceResult } from '../policies/diabetes/diabetes-carbohydrate-adherence.policy.js';
import { decodeMealEvaluationSnapshot } from '../../../meals/snapshots/meal-evaluation-snapshot.adapter.js';
import { FoodEvaluationEngine } from '../../evaluation/services/food-evaluation.engine.js';
import { FoodEvaluationReason } from '../../evaluation/types/food-evaluation.type.js';
import { DailyNutritionProjectionRegistration } from '../types/daily-nutrition-projection.type.js';
import { NutritionInsightSource } from '../sources/nutrition-insight.source.js';
import { NutritionTargetProvenance } from '../types/nutrition-targets.type.js';
import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { MealAssessmentProjection } from './meal-assessment.projection.js';
import { DailyMealAssessmentSource, MealAssessmentLimitation, MealAssessmentLimitationCode } from '../types/meal-assessment.type.js';
import { DailyAdherenceSource } from '../types/daily-adherence.source.js';
import { NumericDailyAdherencePolicy, NumericDailyAdherenceResult } from '../policies/common/numeric-daily-adherence.policy.js';

export function createDailyNutritionProjectionRegistrations(
  evaluationEngine: FoodEvaluationEngine = new FoodEvaluationEngine(),
): readonly DailyNutritionProjectionRegistration[] {
  const diabetes = new DiabetesCarbohydrateAdherencePolicy();
  const numericAdherence = new NumericDailyAdherencePolicy();
  const mealAssessment = new MealAssessmentProjection();
  return [
    {
      projectionId: 'daily-policy-insights-v1',
      project: (context) => ({
        insights: context.historicalReplay
          ? historicalInsights(context.snapshots)
          : currentInsights(context.totals, context.targetCalculation, evaluationEngine),
        deferredPolicies: [],
      }),
    },
    {
      projectionId: 'meal-assessment-v1',
      project: (context) => {
        const mealAssessments = projectMealAssessments(context, mealAssessment);
        return mealAssessments.length === 0
          ? { deferredPolicies: [] }
          : { mealAssessments, deferredPolicies: [] };
      },
    },
    {
      projectionId: 'diabetes-carbohydrate-adherence-v1',
      project: (context) => {
        const targetProvenance = context.targetCalculation.targetProvenance?.find((item) => item.target === 'carbohydrateGrams') ?? null;
        const targetDeferral = context.targetCalculation.deferredPolicies.find((item) => item.policyId === 'diabetes-carbohydrate-target-v1') ?? null;
        const expectedMealItemCount = context.meals.reduce((count, meal) => count + meal.items.length, 0);
        const rules = (context.targetCalculation.resolvedRules ?? []).filter((rule) =>
          (rule.kind === 'upper-limit' || rule.kind === 'lower-target')
          && rule.roles.includes('progress')
          && rule.scopes.includes('daily'));
        // An empty day remains backward compatible with the existing summary
        // contract. Once immutable snapshots exist, every applicable numeric
        // rule participates through the generic projection, including an
        // explicit deferred result when coverage is incomplete.
        const adherenceByPolicy = context.snapshots.length === 0
          ? []
          : rules.map((rule) => numericAdherence.calculate(rule, context.snapshots, expectedMealItemCount));
        const carbohydrateResult = adherenceByPolicy.find((result) => result.target === 'carbohydrateGrams');
        const adherence = carbohydrateResult == null
          ? diabetes.calculate({
            targetCarbohydrateGrams: context.targetCalculation.targets.carbohydrateGrams ?? null,
            targetProvenance,
            targetDeferral,
            snapshots: context.snapshots,
            expectedMealItemCount,
          })
          : toDiabetesAdherence(carbohydrateResult);
        return {
          deferredPolicies: [
            ...adherenceByPolicy.flatMap((result) => result.deferredPolicy == null ? [] : [result.deferredPolicy]),
            ...(adherence.deferredPolicy == null ? [] : [adherence.deferredPolicy]),
          ],
          ...(adherence.status === 'not-applicable' ? {} : { dailyAdherence: carbohydrateResult ?? toDailyAdherence(adherence, context.snapshots) }),
          ...(adherence.status === 'not-applicable' ? {} : { diabetesCarbohydrateAdherence: adherence }),
          ...(adherenceByPolicy.length === 0 ? {} : { dailyAdherenceByPolicy: adherenceByPolicy }),
        };
      },
    },
  ];
}

function toDiabetesAdherence(adherence: NumericDailyAdherenceResult): DiabetesCarbohydrateAdherenceResult {
  return {
    status: adherence.status,
    targetCarbohydrateGrams: adherence.targetValue,
    consumedCarbohydrateGrams: adherence.consumedValue,
    remainingCarbohydrateGrams: adherence.remainingValue,
    exceededByGrams: adherence.exceededValue,
    coveragePercentage: adherence.coveragePercentage,
    targetProvenance: adherence.targetProvenance,
    snapshotIds: adherence.snapshotIds,
    deferredPolicy: adherence.deferredPolicy,
  };
}

function toDailyAdherence(adherence: DiabetesCarbohydrateAdherenceResult, snapshots: readonly MealEvaluationSnapshotSource[]): DailyAdherenceSource {
  const decoded = snapshots.flatMap((snapshot) => {
    try { return [decodeMealEvaluationSnapshot(snapshot)]; } catch { return []; }
  });
  const evaluatorVersions = [...new Set(snapshots.map(({ evaluatorVersion }) => evaluatorVersion).filter(Boolean))];
  const policySetFingerprints = [...new Set(decoded.map(({ policySetFingerprint }) => policySetFingerprint).filter((value): value is string => value != null))];
  const evaluationFingerprint = createHash('sha256').update(JSON.stringify({
    status: adherence.status,
    target: adherence.targetCarbohydrateGrams,
    consumed: adherence.consumedCarbohydrateGrams,
    remaining: adherence.remainingCarbohydrateGrams,
    exceeded: adherence.exceededByGrams,
    coverage: adherence.coveragePercentage,
    snapshotIds: adherence.snapshotIds,
    evaluatorVersions,
    policySetFingerprints,
  })).digest('hex');
  return {
    status: adherence.status,
    targetValue: adherence.targetCarbohydrateGrams,
    consumedValue: adherence.consumedCarbohydrateGrams,
    remainingValue: adherence.remainingCarbohydrateGrams,
    exceededValue: adherence.exceededByGrams,
    coveragePercentage: adherence.coveragePercentage,
    targetProvenance: adherence.targetProvenance,
    snapshotIds: [...adherence.snapshotIds],
    deferredPolicy: adherence.deferredPolicy,
    ...(evaluatorVersions.length === 1 ? { evaluatorVersion: evaluatorVersions[0] } : {}),
    ...(policySetFingerprints.length === 1 ? { policySetFingerprint: policySetFingerprints[0] } : {}),
    evaluationFingerprint,
  };
}

function projectMealAssessments(
  context: Parameters<DailyNutritionProjectionRegistration['project']>[0],
  projection: MealAssessmentProjection,
): readonly DailyMealAssessmentSource[] {
  const latest = latestSnapshots(context.snapshots);
  const byMealItemId = new Map(latest.map((snapshot) => [snapshot.mealItemId, snapshot]));
  return context.meals.flatMap((meal) => {
    if (meal.items.length === 0) {
      return [{ mealId: meal.id, ...projection.project({ resolvedRules: [] }) }];
    }
    if (meal.items.some((item) => item.id == null)) {
      return [assessmentWithLimitation(meal.id, projection, {
        code: context.historicalReplay ? 'missing-historical-evidence' : 'missing-current-evidence',
        explanation: context.historicalReplay
          ? 'Historical meal assessment cannot be replayed because one or more meal items has no evaluation snapshot reference.'
          : 'This meal cannot be assessed because one or more meal items has no evaluation snapshot reference.',
      })];
    }
    const snapshots = meal.items.map((item) => byMealItemId.get(item.id!));
    if (snapshots.some((snapshot) => snapshot == null)) {
      return [assessmentWithLimitation(meal.id, projection, {
        code: context.historicalReplay ? 'missing-historical-evidence' : 'missing-current-evidence',
        explanation: context.historicalReplay
          ? 'Historical meal assessment cannot be replayed because one or more meal item snapshots is unavailable.'
          : 'This meal cannot be assessed because one or more current meal item snapshots is unavailable.',
      })];
    }
    const sources = snapshots.filter((snapshot): snapshot is MealEvaluationSnapshotSource => snapshot != null);
    const payloads = sources.map((snapshot) => decodeMealEvaluationSnapshot(snapshot));
    const snapshotDeferrals = uniqueDeferrals(payloads.flatMap((payload) => payload.deferredPolicies));
    const deferredPolicies = uniqueDeferrals([
      ...(context.historicalReplay ? [] : context.targetCalculation.deferredPolicies),
      ...snapshotDeferrals,
    ]);
    if (context.historicalReplay) {
      const replay = validateHistoricalReplay(sources, payloads);
      if (replay.limitations.length > 0) {
        return [{
          mealId: meal.id,
          ...projection.project({
            resolvedRules: [],
            deferredPolicies,
            limitations: replay.limitations,
            snapshotIds: sources.map((source) => source.id),
          }),
        }];
      }
      const resolvedRules = uniqueRules(payloads.flatMap((payload) => payload.resolvedRules ?? []));
      return [{
        mealId: meal.id,
        ...projection.project({
          contributions: payloads.flatMap((payload) => payload.contributions),
          compatibilityReasons: payloads.flatMap((payload) => payload.reasons),
          resolvedRules,
          deferredPolicies,
          snapshotIds: sources.map((source) => source.id),
          evaluatorVersion: replay.evaluatorVersions[0],
          policySetFingerprint: replay.policySetFingerprints[0],
        }),
      }];
    }

    const resolvedRules = context.targetCalculation.resolvedRules ?? [];
    const limitations: MealAssessmentLimitation[] = resolvedRules.length === 0
      ? [{
          code: 'missing-resolved-rules',
          explanation: 'This meal cannot be assessed because the current resolved evaluation rules are unavailable.',
        }]
      : [];
    const policySetFingerprints = [...new Set(payloads.map((payload) => payload.policySetFingerprint).filter((value): value is string => value != null))];
    const evaluatorVersions = [...new Set(sources.map((source) => source.evaluatorVersion))];
    return [{
      mealId: meal.id,
      ...projection.project({
      contributions: payloads.flatMap((payload) => payload.contributions),
      compatibilityReasons: payloads.flatMap((payload) => payload.reasons),
      resolvedRules,
      deferredPolicies,
      limitations,
      snapshotIds: sources.map((source) => source.id),
      ...(evaluatorVersions.length === 1 ? { evaluatorVersion: evaluatorVersions[0] } : {}),
      ...(policySetFingerprints.length === 1 ? { policySetFingerprint: policySetFingerprints[0] } : {}),
      }),
    }];
  });
}

function assessmentWithLimitation(
  mealId: string,
  projection: MealAssessmentProjection,
  limitation: MealAssessmentLimitation,
): DailyMealAssessmentSource {
  return {
    mealId,
    ...projection.project({ resolvedRules: [], limitations: [limitation] }),
  };
}

function validateHistoricalReplay(
  sources: readonly MealEvaluationSnapshotSource[],
  payloads: readonly ReturnType<typeof decodeMealEvaluationSnapshot>[],
): {
  readonly limitations: readonly MealAssessmentLimitation[];
  readonly evaluatorVersions: readonly string[];
  readonly policySetFingerprints: readonly string[];
} {
  const evaluatorVersions = [...new Set(sources.map((source) => source.evaluatorVersion))].sort();
  const fingerprints = payloads.map((payload) => payload.policySetFingerprint ?? null);
  const policySetFingerprints = [...new Set(fingerprints.filter((value): value is string => value != null))].sort();
  const limitations: MealAssessmentLimitation[] = [];
  if (evaluatorVersions.length > 1) {
    limitations.push({
      code: 'mixed-evaluator-versions',
      evaluatorVersions,
      snapshotIds: sources.map((source) => source.id),
      explanation: `Historical meal assessment cannot merge snapshots evaluated by different evaluator versions: ${evaluatorVersions.join(', ')}.`,
    });
  }
  if (fingerprints.some((value) => value == null)) {
    limitations.push({
      code: 'missing-replay-fingerprint',
      policySetFingerprints,
      snapshotIds: sources.map((source) => source.id),
      explanation: 'Historical meal assessment cannot be replayed because one or more source snapshots has no policy-set fingerprint.',
    });
  } else if (policySetFingerprints.length > 1) {
    limitations.push({
      code: 'mixed-policy-set-fingerprints',
      policySetFingerprints,
      snapshotIds: sources.map((source) => source.id),
      explanation: `Historical meal assessment cannot merge snapshots from different policy sets: ${policySetFingerprints.join(', ')}.`,
    });
  }
  if (payloads.some((payload) => payload.resolvedRules == null)) {
    limitations.push({
      code: 'missing-resolved-rules',
      snapshotIds: sources.map((source) => source.id),
      explanation: 'Historical meal assessment cannot be replayed because one or more source snapshots has no resolved evaluation rules.',
    });
  } else {
    const ruleSignatures = [...new Set(payloads.map((payload) => JSON.stringify(payload.resolvedRules)))];
    if (ruleSignatures.length > 1) {
      limitations.push({
        code: 'mixed-resolved-rules',
        snapshotIds: sources.map((source) => source.id),
        explanation: 'Historical meal assessment cannot merge source snapshots with different resolved evaluation rules.',
      });
    }
  }
  return { limitations, evaluatorVersions, policySetFingerprints };
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

function uniqueRules<T extends { policyId: string; policyVersion: string; target: string }>(rules: readonly T[]): readonly T[] {
  const seen = new Set<string>();
  return rules.filter((rule) => {
    const key = `${rule.policyId}:${rule.policyVersion}:${rule.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function currentInsights(
  totals: readonly { name: string; unit: string; amount: string }[],
  targetCalculation: Parameters<DailyNutritionProjectionRegistration['project']>[0]['targetCalculation'],
  evaluationEngine: FoodEvaluationEngine,
): readonly NutritionInsightSource[] {
  const evaluation = evaluationEngine.evaluate({
    portionGrams: '100',
    nutrients: totals.map((total) => ({ name: total.name, unit: total.unit, amountPer100Grams: total.amount })),
    targets: targetCalculation.targets,
    targetCalculation,
  });
  return evaluation.reasons
    .filter(({ direction }) => direction === 'negative')
    .map((reason) => toInsight(reason, targetCalculation.targetProvenance));
}

function historicalInsights(snapshots: readonly MealEvaluationSnapshotSource[]): readonly NutritionInsightSource[] {
  const seen = new Set<string>();
  const insights: NutritionInsightSource[] = [];
  for (const snapshot of latestSnapshots(snapshots)) {
    const payload = decodeMealEvaluationSnapshot(snapshot);
    for (const reason of payload.reasons.filter(({ direction }) => direction === 'negative')) {
      const key = `${reason.code}:${reason.nutrient}`;
      if (seen.has(key)) continue;
      seen.add(key);
      insights.push({
        ...toInsight(reason, payload.targetProvenance),
        evaluatorVersion: snapshot.evaluatorVersion,
        snapshotId: snapshot.id,
      });
    }
  }
  return insights;
}

function latestSnapshots(snapshots: readonly MealEvaluationSnapshotSource[]): readonly MealEvaluationSnapshotSource[] {
  const latest = new Map<string, MealEvaluationSnapshotSource>();
  for (const snapshot of snapshots) {
    const current = latest.get(snapshot.mealItemId);
    if (current == null || snapshot.evaluatedAt > current.evaluatedAt || (snapshot.evaluatedAt.getTime() === current.evaluatedAt.getTime() && snapshot.id > current.id)) {
      latest.set(snapshot.mealItemId, snapshot);
    }
  }
  return [...latest.values()].sort((left, right) => left.evaluatedAt.getTime() - right.evaluatedAt.getTime() || left.id.localeCompare(right.id));
}

function toInsight(reason: FoodEvaluationReason, provenance: readonly NutritionTargetProvenance[] | undefined): NutritionInsightSource {
  const targetProvenance = provenance?.find((item) => targetKeyForNutrient(reason.nutrient) === item.target);
  return {
    ruleId: reason.code,
    severity: 'warning',
    measuredValue: reason.measuredValue,
    targetValue: reason.targetValue ?? '',
    explanation: reason.explanation,
    ...(targetProvenance == null ? {} : {
      policyId: targetProvenance.policyId,
      policyVersion: targetProvenance.version,
      provenance: targetProvenance,
    }),
  };
}

function targetKeyForNutrient(nutrient: string): string | null {
  const normalized = nutrient.trim().toLowerCase().replace(/\s+/g, ' ').replace(/-/g, ' ');
  if (normalized === 'sodium') return 'sodiumMilligrams';
  if (normalized === 'potassium') return 'potassiumMilligrams';
  if (normalized === 'phosphorus') return 'phosphorusMilligrams';
  if (normalized === 'saturated fat') return 'saturatedFatGrams';
  if (normalized === 'added sugar') return 'addedSugarGrams';
  if (normalized === 'cholesterol') return 'cholesterolMilligrams';
  return null;
}
