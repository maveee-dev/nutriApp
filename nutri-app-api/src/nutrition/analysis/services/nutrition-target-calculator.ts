import { Inject, Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { LaboratoryFindingSource } from '../../../laboratory/sources/laboratory-finding.source.js';
import { ProfileSource } from '../../../profiles/sources/profile.source.js';
import { DiabetesCarbohydrateTargetSource } from '../types/diabetes-carbohydrate-target.type.js';
import { NutritionTargetCalculation } from '../types/nutrition-targets.type.js';
import { NutritionTargetPolicyRegistration } from '../types/nutrition-target-policy.type.js';
import { NutritionEvaluationContext, DialysisModalityContext, DialysisStatusContext } from '../types/nutrition-evaluation-context.type.js';
import { EnergyGoal } from '../policies/common/energy.policy.js';
import { NutritionTargetResolver } from './nutrition-target.resolver.js';
import { NUTRITION_TARGET_POLICY_REGISTRATIONS } from './nutrition-target.tokens.js';
import { createNutritionTargetPolicyRegistrations } from './nutrition-target-registrations.js';
import { createNutritionPolicySetFingerprint } from './nutrition-policy-set-fingerprint.js';

@Injectable()
export class NutritionTargetCalculator {
  constructor(
    @Inject(NUTRITION_TARGET_POLICY_REGISTRATIONS)
    private readonly registrations: readonly NutritionTargetPolicyRegistration[] = createNutritionTargetPolicyRegistrations(),
    private readonly resolver: NutritionTargetResolver = new NutritionTargetResolver(),
  ) {}

  calculate(
    profile: Pick<ProfileSource, 'weightKg'> & Partial<Pick<ProfileSource, 'age' | 'sex' | 'heightCm' | 'activityLevel' | 'nutritionGoal'>> | null,
    conditionCodes: readonly string[] = [],
    egfrFinding: LaboratoryFindingSource | null = null,
    dialysisStatus: DialysisStatusContext | null = null,
    energyGoal: EnergyGoal = 'maintenance',
    diabetesCarbohydrateTarget: DiabetesCarbohydrateTargetSource | null = null,
    asOf: Date = new Date(),
    dialysisModality: DialysisModalityContext | null = null,
    dialysisReportedAt: Date | null = null,
  ): NutritionTargetCalculation {
    return this.calculateFromContext({
      profile,
      conditionCodes,
      energyGoal,
      asOf,
      evidence: {
        diabetes: { carbohydrateTarget: diabetesCarbohydrateTarget },
        renal: { egfrFinding, dialysisStatus, dialysisModality, dialysisReportedAt, potassiumFinding: null },
        'individualized-targets': { targets: [] },
      },
    });
  }

  calculateFromContext(context: NutritionEvaluationContext): NutritionTargetCalculation {
    const baselineProteinGrams = context.profile?.weightKg == null
      ? null
      : new Decimal('0.8').mul(context.profile.weightKg).toString();
    const policyContext = {
      ...context,
      baselineProteinGrams,
    };
    const candidates = [] as import('../types/nutrition-target-policy.type.js').NutritionTargetCandidate[];
    const deferredPolicies = [] as import('../types/nutrition-targets.type.js').NutritionPolicyDeferralSource[];
    for (const registration of this.registrations) {
      const output = registration.evaluate(policyContext, candidates);
      this.validatePolicyOutput(registration, output.candidates, candidates);
      candidates.push(...output.candidates);
      deferredPolicies.push(...output.deferredPolicies);
    }
    return this.resolver.resolve(
      candidates,
      deferredPolicies,
      context.profile?.nutritionGoal == null ? undefined : context.energyGoal,
      this.registrations,
    );
  }

  getPolicySetFingerprint(): string {
    return createNutritionPolicySetFingerprint(this.registrations);
  }

  private validatePolicyOutput(
    registration: NutritionTargetPolicyRegistration,
    output: readonly import('../types/nutrition-target-policy.type.js').NutritionTargetCandidate[],
    existing: readonly import('../types/nutrition-target-policy.type.js').NutritionTargetCandidate[],
  ): void {
    const existingIds = new Set(existing.map((candidate) => candidate.candidateId));
    for (const candidate of output) {
      if (candidate.policyId !== registration.policyId || candidate.policyVersion !== registration.version) {
        throw new Error(`Nutrition target policy ${registration.policyId} emitted mismatched candidate metadata.`);
      }
      if (existingIds.has(candidate.candidateId)) throw new Error(`Duplicate nutrition target candidate: ${candidate.candidateId}.`);
      const expectedPrecedence = registration.precedenceByConflictKey?.[candidate.conflictKey];
      if (expectedPrecedence != null && expectedPrecedence !== candidate.precedence) {
        throw new Error(`Nutrition target policy ${registration.policyId} emitted invalid precedence for ${candidate.conflictKey}.`);
      }
    }
  }
}
