import { Injectable } from '@nestjs/common';
import { DiabetesCarbohydrateTargetRepository } from '../repositories/diabetes-carbohydrate-target.repository.js';
import { LaboratoryResultsService } from '../../../laboratory/services/laboratory-results.service.js';
import { UserDialysisStatusRepository } from '../../../dialysis/repositories/user-dialysis-status.repository.js';
import { NutritionEvidenceProvider } from '../types/nutrition-evidence-provider.type.js';
import { DiabetesNutritionEvidence } from '../types/diabetes-nutrition-evidence.slice.js';
import { RenalNutritionEvidence } from '../types/renal-nutrition-evidence.slice.js';
import { IndividualizedNutritionTargetEvidenceRepository } from '../repositories/individualized-nutrition-target-evidence.repository.js';
import { IndividualizedTargetsNutritionEvidence } from '../types/individualized-targets-nutrition-evidence.slice.js';

export const DIABETES_EVIDENCE_KEY = 'diabetes';
export const RENAL_EVIDENCE_KEY = 'renal';
export const INDIVIDUALIZED_TARGETS_EVIDENCE_KEY = 'individualized-targets';

@Injectable()
export class DiabetesNutritionEvidenceProvider implements NutritionEvidenceProvider<DiabetesNutritionEvidence> {
  readonly key = DIABETES_EVIDENCE_KEY;

  constructor(private readonly repository: DiabetesCarbohydrateTargetRepository) {}

  async load(userId: string): Promise<DiabetesNutritionEvidence> {
    return { carbohydrateTarget: await this.repository.findByUserId(userId) };
  }
}

@Injectable()
export class RenalNutritionEvidenceProvider implements NutritionEvidenceProvider<RenalNutritionEvidence> {
  readonly key = RENAL_EVIDENCE_KEY;

  constructor(
    private readonly laboratoryResultsService: LaboratoryResultsService,
    private readonly dialysisStatusRepository: UserDialysisStatusRepository,
  ) {}

  async load(userId: string): Promise<RenalNutritionEvidence> {
    const [egfrEvidence, potassiumEvidence, phosphorusEvidence, dialysisStatus] = await Promise.all([
      this.laboratoryResultsService.findLatestEgfrEvidence(userId),
      this.laboratoryResultsService.findLatestPotassiumEvidence(userId),
      this.laboratoryResultsService.findLatestPhosphorusEvidence(userId),
      this.dialysisStatusRepository.findByUserId(userId),
    ]);
    return {
      egfrFinding: egfrEvidence.finding,
      egfrFailureReason: egfrEvidence.failureReason,
      egfrFailureExplanation: egfrEvidence.failureExplanation,
      potassiumFinding: potassiumEvidence.finding,
      potassiumFailureReason: potassiumEvidence.failureReason,
      potassiumFailureExplanation: potassiumEvidence.failureExplanation,
      phosphorusFinding: phosphorusEvidence.finding,
      phosphorusFailureReason: phosphorusEvidence.failureReason,
      phosphorusFailureExplanation: phosphorusEvidence.failureExplanation,
      dialysisStatus: dialysisStatus?.status === 'ACTIVE' ? 'ACTIVE' : dialysisStatus == null ? null : 'INACTIVE',
      dialysisModality: dialysisStatus == null ? null : this.toModality(dialysisStatus.modality),
      dialysisReportedAt: dialysisStatus?.reportedAt ?? null,
    };
  }

  private toModality(value: string): RenalNutritionEvidence['dialysisModality'] {
    return value === 'HEMODIALYSIS' || value === 'PERITONEAL_DIALYSIS' || value === 'CONFLICTING' ? value : 'UNKNOWN';
  }
}

@Injectable()
export class IndividualizedTargetsNutritionEvidenceProvider implements NutritionEvidenceProvider<IndividualizedTargetsNutritionEvidence> {
  readonly key = INDIVIDUALIZED_TARGETS_EVIDENCE_KEY;

  constructor(private readonly repository: IndividualizedNutritionTargetEvidenceRepository) {}

  async load(userId: string): Promise<IndividualizedTargetsNutritionEvidence> {
    return { targets: await this.repository.findCurrentByUserId(userId) };
  }
}
