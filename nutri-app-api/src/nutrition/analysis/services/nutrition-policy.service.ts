import { Inject, Injectable } from '@nestjs/common';
import { ConditionsRepository } from '../../../conditions/repositories/conditions.repository.js';
import { ProfilesRepository } from '../../../profiles/repositories/profiles.repository.js';
import { NutritionTargetCalculation } from '../types/nutrition-targets.type.js';
import { NutritionTargetCalculator } from './nutrition-target-calculator.js';
import { EnergyGoal } from '../policies/common/energy.policy.js';
import { NutritionGoal } from '../../../../generated/prisma/client.js';
import { NutritionEvaluationContext } from '../types/nutrition-evaluation-context.type.js';
import { NutritionEvidenceProvider } from '../types/nutrition-evidence-provider.type.js';
import { NUTRITION_EVIDENCE_PROVIDERS } from './nutrition-evidence.tokens.js';
import { requireEvidenceSlice } from '../types/nutrition-evidence-provider.type.js';
import { RenalNutritionEvidence } from '../types/renal-nutrition-evidence.slice.js';
import { DiabetesNutritionEvidence } from '../types/diabetes-nutrition-evidence.slice.js';
import { DIABETES_EVIDENCE_KEY, RENAL_EVIDENCE_KEY } from './nutrition-evidence.providers.js';

/** Coordinates user evidence retrieval and execution of the explicit nutrition policies. */
@Injectable()
export class NutritionPolicyService {
  constructor(
    private readonly profilesRepository: ProfilesRepository,
    private readonly conditionsRepository: ConditionsRepository,
    private readonly targetCalculator: NutritionTargetCalculator,
    @Inject(NUTRITION_EVIDENCE_PROVIDERS)
    private readonly evidenceProviders: readonly NutritionEvidenceProvider[] = [],
  ) {}

  async calculateForUser(userId: string, energyGoal: EnergyGoal = 'maintenance'): Promise<NutritionTargetCalculation> {
    const context = await this.loadContext(userId, energyGoal);
    if (typeof this.targetCalculator.calculateFromContext === 'function') return this.targetCalculator.calculateFromContext(context);
    return this.targetCalculator.calculate(context.profile, context.conditionCodes, this.renal(context).egfrFinding, this.renal(context).dialysisStatus, context.energyGoal, this.diabetes(context).carbohydrateTarget, context.asOf, this.renal(context).dialysisModality, this.renal(context).dialysisReportedAt);
  }

  async loadContext(userId: string, energyGoal: EnergyGoal = 'maintenance'): Promise<NutritionEvaluationContext> {
    const [profile, conditions, ...evidenceSlices] = await Promise.all([
      this.profilesRepository.getMyProfile(userId),
      this.conditionsRepository.findUserConditions(userId),
      ...this.evidenceProviders.map((provider) => provider.load(userId)),
    ]);
    const evidence = Object.fromEntries(this.evidenceProviders.map((provider, index) => [provider.key, evidenceSlices[index]]));

    const selectedGoal = profile?.nutritionGoal == null
      ? energyGoal
      : this.toEnergyGoal(profile.nutritionGoal);

    return Object.freeze({
      profile,
      conditionCodes: conditions.map(({ condition }) => condition.code),
      energyGoal: selectedGoal,
      asOf: new Date(),
      evidence,
    });
  }

  calculateFromContext(context: NutritionEvaluationContext): NutritionTargetCalculation {
    if (typeof this.targetCalculator.calculateFromContext === 'function') return this.targetCalculator.calculateFromContext(context);
    return this.targetCalculator.calculate(context.profile, context.conditionCodes, this.renal(context).egfrFinding, this.renal(context).dialysisStatus, context.energyGoal, this.diabetes(context).carbohydrateTarget, context.asOf, this.renal(context).dialysisModality, this.renal(context).dialysisReportedAt);
  }

  getPolicySetFingerprint(): string | null {
    return typeof this.targetCalculator.getPolicySetFingerprint === 'function'
      ? this.targetCalculator.getPolicySetFingerprint()
      : null;
  }

  private renal(context: NutritionEvaluationContext): RenalNutritionEvidence {
    return requireEvidenceSlice<RenalNutritionEvidence>(context.evidence, RENAL_EVIDENCE_KEY);
  }

  private diabetes(context: NutritionEvaluationContext): DiabetesNutritionEvidence {
    return requireEvidenceSlice<DiabetesNutritionEvidence>(context.evidence, DIABETES_EVIDENCE_KEY);
  }

  private toEnergyGoal(goal: NutritionGoal): EnergyGoal {
    switch (goal) {
      case NutritionGoal.WEIGHT_LOSS: return 'weight-loss';
      case NutritionGoal.MUSCLE_GAIN: return 'muscle-gain';
      case NutritionGoal.WEIGHT_GAIN: return 'weight-gain';
      case NutritionGoal.MAINTENANCE: return 'maintenance';
    }
  }
}
