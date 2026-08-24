import { createHash } from 'node:crypto';
import { Decimal } from 'decimal.js';
import { CanonicalCalculationKernel } from '../../../calculation/index.js';
import { decodeMealEvaluationSnapshot } from '../../../../meals/snapshots/meal-evaluation-snapshot.adapter.js';
import { MealEvaluationSnapshotSource } from '../../../../meals/sources/meal-evaluation-snapshot.source.js';
import { NumericConstraintRule } from '../../types/evaluation-rule.type.js';
import { DailyAdherenceSource } from '../../types/daily-adherence.source.js';
import { NutritionPolicyDeferralSource } from '../../types/nutrition-targets.type.js';

export interface NumericDailyAdherenceResult extends DailyAdherenceSource {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly target: NumericConstraintRule['target'];
  readonly measurementKey: string;
  readonly ruleKind: NumericConstraintRule['kind'];
}

/**
 * Aggregates immutable food contributions for any resolved numeric rule. It
 * deliberately knows no nutrient or condition names; the resolved rule owns
 * the measurement key, unit, and semantics.
 */
export class NumericDailyAdherencePolicy {
  private readonly calculationKernel = new CanonicalCalculationKernel();

  calculate(
    rule: NumericConstraintRule,
    snapshots: readonly MealEvaluationSnapshotSource[],
    expectedMealItemCount: number,
  ): NumericDailyAdherenceResult {
    const latestSnapshots = this.latestSnapshots(snapshots);
    const replay = this.replayMetadata(latestSnapshots);
    const base = {
      policyId: rule.policyId,
      policyVersion: rule.policyVersion,
      target: rule.target,
      measurementKey: rule.measurementKey,
      ruleKind: rule.kind,
      targetValue: rule.targetValue,
      targetProvenance: rule.provenance ?? null,
      snapshotIds: latestSnapshots.map(({ id }) => id),
      ...(replay.evaluatorVersions.length === 1 ? { evaluatorVersion: replay.evaluatorVersions[0] } : {}),
      ...(replay.policySetFingerprints.length === 1 ? { policySetFingerprint: replay.policySetFingerprints[0] } : {}),
    } satisfies Omit<NumericDailyAdherenceResult, 'status' | 'consumedValue' | 'remainingValue' | 'exceededValue' | 'coveragePercentage' | 'deferredPolicy' | 'evaluationFingerprint'>;

    const limitation = this.replayLimitation(rule, replay, latestSnapshots);
    if (limitation != null) return this.deferred(base, limitation, replay);

    const values = latestSnapshots.map((snapshot) => this.measurement(snapshot, rule));
    if (values.some((value) => value == null) || latestSnapshots.length < expectedMealItemCount) {
      return this.deferred(base, {
        policyId: rule.policyId,
        reason: 'insufficient-historical-coverage',
        explanation: `Daily ${rule.measurementKey} adherence is deferred because one or more meal items has no valid ${rule.unit} contribution.`,
      }, replay);
    }

    const consumedAmount = this.calculationKernel.aggregateContributions(
      values
        .filter((value): value is Decimal => value != null)
        .map((value) => ({
          nutrientKey: rule.measurementKey,
          name: rule.measurementKey,
          unit: rule.unit,
          amount: value.toString(),
        })),
    ).contributions[0]?.amount ?? '0';
    const consumed = new Decimal(consumedAmount);
    const target = new Decimal(rule.targetValue);
    const remaining = Decimal.max(target.minus(consumed), 0);
    const exceeded = rule.kind === 'upper-limit' ? Decimal.max(consumed.minus(target), 0) : null;
    const coveragePercentage = expectedMealItemCount === 0
      ? 100
      : new Decimal(latestSnapshots.length).div(expectedMealItemCount).mul(100).toDecimalPlaces(2).toNumber();
    const result = {
      ...base,
      status: 'available' as const,
      consumedValue: consumed.toString(),
      remainingValue: remaining.toString(),
      exceededValue: exceeded?.toString() ?? null,
      coveragePercentage,
      deferredPolicy: null,
    };
    return { ...result, evaluationFingerprint: this.fingerprint(result, replay) };
  }

  private measurement(snapshot: MealEvaluationSnapshotSource, rule: NumericConstraintRule): Decimal | null {
    try {
      const payload = decodeMealEvaluationSnapshot(snapshot);
      const contribution = payload.contributions.find((item) => this.sameMeasurement(item.nutrient, rule.measurementKey) && item.unit?.trim().toLowerCase() === rule.unit.trim().toLowerCase());
      if (contribution != null) return new Decimal(contribution.amount);
      const reason = payload.reasons.find((item) => this.sameMeasurement(item.nutrient, rule.measurementKey) && item.targetValue != null);
      return reason == null ? null : new Decimal(reason.measuredValue);
    } catch {
      return null;
    }
  }

  private sameMeasurement(left: string, right: string): boolean {
    return left.trim().toLowerCase().replace(/[-_\s]+/g, '') === right.trim().toLowerCase().replace(/[-_\s]+/g, '');
  }

  private deferred(
    base: Omit<NumericDailyAdherenceResult, 'status' | 'consumedValue' | 'remainingValue' | 'exceededValue' | 'coveragePercentage' | 'deferredPolicy' | 'evaluationFingerprint'>,
    deferredPolicy: NutritionPolicyDeferralSource,
    replay: { readonly evaluatorVersions: readonly string[]; readonly policySetFingerprints: readonly string[] },
  ): NumericDailyAdherenceResult {
    const result = { ...base, status: 'deferred' as const, consumedValue: null, remainingValue: null, exceededValue: null, coveragePercentage: null, deferredPolicy };
    return { ...result, evaluationFingerprint: this.fingerprint(result, replay) };
  }

  private replayMetadata(snapshots: readonly MealEvaluationSnapshotSource[]) {
    const evaluatorVersions = [...new Set(snapshots.map(({ evaluatorVersion }) => evaluatorVersion))].sort();
    const policySetFingerprints = [...new Set(snapshots.flatMap((snapshot) => {
      try {
        const fingerprint = decodeMealEvaluationSnapshot(snapshot).policySetFingerprint;
        return fingerprint == null ? [] : [fingerprint];
      } catch {
        return [];
      }
    }))].sort();
    return { evaluatorVersions, policySetFingerprints };
  }

  private replayLimitation(
    rule: NumericConstraintRule,
    metadata: { readonly evaluatorVersions: readonly string[]; readonly policySetFingerprints: readonly string[] },
    snapshots: readonly MealEvaluationSnapshotSource[],
  ): NutritionPolicyDeferralSource | null {
    if (metadata.evaluatorVersions.length > 1) return { policyId: 'daily-adherence', reason: 'mixed-evaluator-versions', explanation: `Daily adherence cannot merge snapshots evaluated by different evaluator versions: ${metadata.evaluatorVersions.join(', ')}.` };
    if (metadata.policySetFingerprints.length > 1) return { policyId: 'daily-adherence', reason: 'mixed-policy-set-fingerprints', explanation: `Daily adherence cannot merge snapshots from different policy sets: ${metadata.policySetFingerprints.join(', ')}.` };
    if (snapshots.some((snapshot) => {
      try { return decodeMealEvaluationSnapshot(snapshot).policySetFingerprint == null; } catch { return true; }
    })) return { policyId: 'daily-adherence', reason: 'missing-replay-fingerprint', explanation: 'Daily adherence cannot be replayed because one or more source snapshots has no policy-set fingerprint.' };
    const ruleSignatures = snapshots.map((snapshot) => {
      try {
        const resolved = decodeMealEvaluationSnapshot(snapshot).resolvedRules;
        const matching = resolved?.find((candidate) => candidate.policyId === rule.policyId && candidate.policyVersion === rule.policyVersion && candidate.target === rule.target);
        return matching == null ? null : JSON.stringify(matching);
      } catch {
        return null;
      }
    });
    if (ruleSignatures.some((signature) => signature == null)) return { policyId: rule.policyId, reason: 'missing-resolved-rule', explanation: `Daily ${rule.measurementKey} adherence cannot be replayed because one or more source snapshots has no matching resolved evaluation rule.` };
    if (new Set(ruleSignatures).size > 1) return { policyId: rule.policyId, reason: 'mixed-resolved-rules', explanation: `Daily ${rule.measurementKey} adherence cannot merge snapshots with different resolved evaluation rules.` };
    return null;
  }

  private fingerprint(value: unknown, metadata: { readonly evaluatorVersions: readonly string[]; readonly policySetFingerprints: readonly string[] }): string {
    return createHash('sha256').update(JSON.stringify({ value, metadata })).digest('hex');
  }

  private latestSnapshots(snapshots: readonly MealEvaluationSnapshotSource[]): readonly MealEvaluationSnapshotSource[] {
    const latest = new Map<string, MealEvaluationSnapshotSource>();
    for (const snapshot of snapshots) {
      const current = latest.get(snapshot.mealItemId);
      if (current == null || snapshot.evaluatedAt > current.evaluatedAt || (snapshot.evaluatedAt.getTime() === current.evaluatedAt.getTime() && snapshot.id > current.id)) latest.set(snapshot.mealItemId, snapshot);
    }
    return [...latest.values()].sort((left, right) => left.mealItemId.localeCompare(right.mealItemId));
  }
}
