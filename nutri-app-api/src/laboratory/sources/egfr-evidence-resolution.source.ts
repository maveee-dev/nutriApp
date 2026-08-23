import { LaboratoryFindingSource } from './laboratory-finding.source.js';

export type EgfrEvidenceFailureReason =
  | 'no-egfr-found'
  | 'invalid-egfr-unit'
  | 'invalid-egfr-value';

export interface EgfrEvidenceResolution {
  readonly finding: LaboratoryFindingSource | null;
  readonly failureReason: EgfrEvidenceFailureReason | null;
  readonly failureExplanation: string | null;
}
