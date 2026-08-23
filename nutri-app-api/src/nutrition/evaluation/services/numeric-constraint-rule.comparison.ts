import { FoodEvaluationEngine } from './food-evaluation.engine.js';
import { FoodEvaluationInput } from '../types/food-evaluation.type.js';
import { NumericConstraintRule } from '../../analysis/types/evaluation-rule.type.js';
import { NumericConstraintRuleEvaluation, NumericConstraintRuleShadowEvaluator } from './numeric-constraint-rule.shadow.js';

export interface NumericConstraintParityOptions {
  /** Denominator used by the legacy compatibility coverage calculation. */
  readonly totalCompatibilityWeight: number;
  readonly policyFingerprint?: string | null;
  readonly snapshotPayload?: unknown;
}

export interface NumericConstraintEvaluationContract {
  readonly evaluationStatus: 'evaluated' | 'insufficient-evidence';
  readonly score: number;
  readonly coverage: number;
  readonly reasons: readonly unknown[];
  readonly deferredPolicies: readonly unknown[];
  readonly resolvedRule: NumericConstraintRule;
  readonly provenance: NumericConstraintRule['provenance'];
  readonly policyFingerprint: string | null;
  readonly snapshotPayload: unknown;
}

export interface NumericConstraintParityResult {
  readonly legacyReason: { readonly code: string; readonly measuredValue: string; readonly targetValue: string | null } | null;
  readonly shadow: NumericConstraintRuleEvaluation;
  readonly legacyContract: NumericConstraintEvaluationContract;
  readonly shadowContract: NumericConstraintEvaluationContract;
  readonly differences: readonly string[];
  readonly equivalent: boolean;
}

/** Internal comparison tooling. It does not alter the production evaluator. */
export class NumericConstraintRuleComparisonService {
  constructor(
    private readonly legacyEvaluator: FoodEvaluationEngine = new FoodEvaluationEngine(),
    private readonly shadowEvaluator: NumericConstraintRuleShadowEvaluator = new NumericConstraintRuleShadowEvaluator(),
  ) {}

  compare(rule: NumericConstraintRule, input: FoodEvaluationInput, options: NumericConstraintParityOptions): NumericConstraintParityResult {
    const legacy = this.legacyEvaluator.evaluate(input);
    const legacyReason = legacy.reasons.find((reason) => reason.nutrient === rule.measurementKey) ?? null;
    const shadow = this.shadowEvaluator.evaluate(rule, input);
    const legacyContract = this.createContract(legacy, rule, options);
    const shadowContract = this.createShadowContract(shadow, input, rule, options);
    const differences = this.diff(legacyContract, shadowContract);
    return {
      legacyReason: legacyReason == null ? null : { code: legacyReason.code, measuredValue: legacyReason.measuredValue, targetValue: legacyReason.targetValue },
      shadow,
      legacyContract,
      shadowContract,
      differences,
      equivalent: differences.length === 0,
    };
  }

  private createContract(
    evaluation: ReturnType<FoodEvaluationEngine['evaluate']>,
    rule: NumericConstraintRule,
    options: NumericConstraintParityOptions,
  ): NumericConstraintEvaluationContract {
    return {
      evaluationStatus: evaluation.evaluationStatus ?? 'evaluated', score: evaluation.score, coverage: evaluation.coverage,
      reasons: evaluation.reasons, deferredPolicies: evaluation.deferredPolicies, resolvedRule: rule,
      provenance: rule.provenance, policyFingerprint: options.policyFingerprint ?? null, snapshotPayload: options.snapshotPayload ?? null,
    };
  }

  private createShadowContract(
    shadow: NumericConstraintRuleEvaluation,
    input: FoodEvaluationInput,
    rule: NumericConstraintRule,
    options: NumericConstraintParityOptions,
  ): NumericConstraintEvaluationContract {
    const quality = shadow.quality ?? 0;
    const status = shadow.evaluated ? 'evaluated' : 'insufficient-evidence';
    const reasons = shadow.evaluated ? [{
      code: shadow.reasonCode,
      direction: shadow.direction,
      nutrient: rule.measurementKey,
      measuredValue: shadow.measuredValue,
      targetValue: rule.targetValue,
      explanation: shadow.direction === 'negative'
        ? `This portion provides ${shadow.measuredValue} ${rule.unit} of ${rule.measurementKey}, above the current daily limit of ${rule.targetValue} ${rule.unit}. This negatively affects compatibility because it exceeds the applicable ${rule.measurementKey} limit.`
        : `This portion provides ${shadow.measuredValue} ${rule.unit} of ${rule.measurementKey} against the current daily limit of ${rule.targetValue} ${rule.unit}. This supports compatibility because it remains within the applicable ${rule.measurementKey} limit.`,
    }] : [];
    const coverage = shadow.evaluated ? Math.round((rule.weight / options.totalCompatibilityWeight) * 10000) / 100 : 0;
    return {
      evaluationStatus: status, score: shadow.evaluated ? Math.round(quality * 100) : 0, coverage,
      reasons, deferredPolicies: input.targetCalculation.deferredPolicies, resolvedRule: rule,
      provenance: rule.provenance, policyFingerprint: options.policyFingerprint ?? null, snapshotPayload: options.snapshotPayload ?? null,
    };
  }

  private diff(left: NumericConstraintEvaluationContract, right: NumericConstraintEvaluationContract): readonly string[] {
    const differences: string[] = [];
    for (const key of ['evaluationStatus', 'score', 'coverage', 'reasons', 'deferredPolicies', 'resolvedRule', 'provenance', 'policyFingerprint', 'snapshotPayload'] as const) {
      if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) differences.push(key);
    }
    return differences;
  }
}
