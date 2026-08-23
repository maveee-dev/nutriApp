import { MealEvaluationSnapshotSource } from '../sources/meal-evaluation-snapshot.source.js';
import { NutritionPolicyDeferralSource, NutritionTargetProvenance, NutritionTargets } from '../../nutrition/analysis/types/nutrition-targets.type.js';
import { FoodEvaluationContribution, FoodEvaluationReason } from '../../nutrition/evaluation/types/food-evaluation.type.js';
import { isValidNutritionTargets } from '../../nutrition/analysis/types/nutrition-target-descriptor.js';
import { NumericConstraintRule } from '../../nutrition/analysis/types/evaluation-rule.type.js';

export interface EvaluationSnapshotPayload {
  readonly reasons: readonly FoodEvaluationReason[];
  readonly contributions: readonly FoodEvaluationContribution[];
  readonly evaluationStatus?: 'evaluated' | 'insufficient-evidence';
  readonly targets: NutritionTargets;
  readonly deferredPolicies: readonly NutritionPolicyDeferralSource[];
  readonly goal?: string | null;
  readonly targetProvenance?: readonly NutritionTargetProvenance[];
  readonly resolvedRules?: readonly NumericConstraintRule[];
  readonly policySetFingerprint?: string;
  readonly snapshotFingerprint?: string;
}

export function decodeMealEvaluationSnapshot(snapshot: MealEvaluationSnapshotSource): EvaluationSnapshotPayload {
  const payload = snapshot.payload as Partial<EvaluationSnapshotPayload>;
  if (!Array.isArray(payload.reasons) || !payload.reasons.every(isEvaluationReason)) throw new Error(`Snapshot ${snapshot.id} does not contain valid evaluation reasons.`);
  if (!Array.isArray(payload.contributions) || !payload.contributions.every(isEvaluationContribution)) throw new Error(`Snapshot ${snapshot.id} does not contain valid evaluation contributions.`);
  if (payload.evaluationStatus !== undefined && payload.evaluationStatus !== 'evaluated' && payload.evaluationStatus !== 'insufficient-evidence') throw new Error(`Snapshot ${snapshot.id} does not contain a valid evaluation status.`);
  if (!isValidNutritionTargets(payload.targets)) throw new Error(`Snapshot ${snapshot.id} does not contain valid nutrition targets.`);
  if (!Array.isArray(payload.deferredPolicies) || !payload.deferredPolicies.every(isPolicyDeferral)) throw new Error(`Snapshot ${snapshot.id} does not contain valid deferred policies.`);
  if (payload.targetProvenance != null && !Array.isArray(payload.targetProvenance)) throw new Error(`Snapshot ${snapshot.id} does not contain valid target provenance.`);
  if (payload.resolvedRules != null && (!Array.isArray(payload.resolvedRules) || !payload.resolvedRules.every(isNumericConstraintRule))) throw new Error(`Snapshot ${snapshot.id} does not contain valid resolved rules.`);
  if (payload.policySetFingerprint != null && typeof payload.policySetFingerprint !== 'string') throw new Error(`Snapshot ${snapshot.id} does not contain a valid policy-set fingerprint.`);
  if (payload.snapshotFingerprint != null && typeof payload.snapshotFingerprint !== 'string') throw new Error(`Snapshot ${snapshot.id} does not contain a valid snapshot fingerprint.`);
  return {
    reasons: payload.reasons,
    contributions: payload.contributions,
    ...(payload.evaluationStatus === undefined ? {} : { evaluationStatus: payload.evaluationStatus }),
    targets: payload.targets,
    deferredPolicies: payload.deferredPolicies,
    ...(payload.goal === undefined ? {} : { goal: payload.goal }),
    ...(payload.targetProvenance === undefined ? {} : { targetProvenance: payload.targetProvenance }),
    ...(payload.resolvedRules === undefined ? {} : { resolvedRules: payload.resolvedRules }),
    ...(payload.policySetFingerprint === undefined ? {} : { policySetFingerprint: payload.policySetFingerprint }),
    ...(payload.snapshotFingerprint === undefined ? {} : { snapshotFingerprint: payload.snapshotFingerprint }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function isEvaluationReason(value: unknown): value is FoodEvaluationReason {
  return isRecord(value) && typeof value.code === 'string' && (value.direction === 'positive' || value.direction === 'negative' || value.direction === 'neutral') && typeof value.nutrient === 'string' && typeof value.measuredValue === 'string' && (value.targetValue === null || typeof value.targetValue === 'string') && typeof value.explanation === 'string';
}
function isEvaluationContribution(value: unknown): value is FoodEvaluationContribution {
  return isRecord(value) && typeof value.nutrient === 'string' && (value.unit === undefined || typeof value.unit === 'string') && typeof value.amount === 'string' && (value.targetValue === null || typeof value.targetValue === 'string') && (value.currentDailyValue === null || typeof value.currentDailyValue === 'string') && typeof value.explanation === 'string';
}
function isPolicyDeferral(value: unknown): value is NutritionPolicyDeferralSource { return isRecord(value) && typeof value.policyId === 'string' && typeof value.reason === 'string' && typeof value.explanation === 'string'; }
function isNumericConstraintRule(value: unknown): value is NumericConstraintRule {
  return isRecord(value)
    && value.family === 'numeric-constraint'
    && (value.kind === 'upper-limit' || value.kind === 'lower-target' || value.kind === 'recommended-range')
    && Array.isArray(value.roles)
    && value.roles.every((role) => role === 'compatibility' || role === 'contribution' || role === 'progress')
    && Array.isArray(value.scopes)
    && value.scopes.every((scope) => scope === 'food' || scope === 'meal' || scope === 'daily')
    && typeof value.measurementKey === 'string'
    && typeof value.unit === 'string'
    && typeof value.weight === 'number'
    && typeof value.target === 'string'
    && typeof value.targetValue === 'string'
    && typeof value.policyId === 'string'
    && typeof value.policyVersion === 'string'
    && typeof value.conflictKey === 'string'
    && typeof value.precedence === 'number';
}
