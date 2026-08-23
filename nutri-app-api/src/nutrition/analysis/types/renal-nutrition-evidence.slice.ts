import { DialysisModalityContext, DialysisStatusContext } from './nutrition-evaluation-context.type.js';
import { LaboratoryFindingSource } from '../../../laboratory/sources/laboratory-finding.source.js';
import { EgfrEvidenceFailureReason } from '../../../laboratory/sources/egfr-evidence-resolution.source.js';

export interface RenalNutritionEvidence {
  readonly egfrFinding: LaboratoryFindingSource | null;
  readonly egfrFailureReason?: EgfrEvidenceFailureReason | null;
  readonly egfrFailureExplanation?: string | null;
  readonly dialysisStatus: DialysisStatusContext | null;
  readonly dialysisModality: DialysisModalityContext | null;
  readonly dialysisReportedAt: Date | null;
  readonly potassiumFinding: LaboratoryFindingSource | null;
  readonly potassiumFailureReason?: string | null;
  readonly potassiumFailureExplanation?: string | null;
  readonly phosphorusFinding?: LaboratoryFindingSource | null;
  readonly phosphorusFailureReason?: string | null;
  readonly phosphorusFailureExplanation?: string | null;
}
