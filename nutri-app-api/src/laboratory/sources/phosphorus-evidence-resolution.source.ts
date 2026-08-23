import { LaboratoryFindingSource } from './laboratory-finding.source.js';

export type PhosphorusEvidenceFailureReason =
  | 'no-phosphorus-found'
  | 'invalid-phosphorus-unit'
  | 'invalid-phosphorus-value';

export interface PhosphorusEvidenceResolution {
  readonly finding: LaboratoryFindingSource | null;
  readonly failureReason: PhosphorusEvidenceFailureReason | null;
  readonly failureExplanation: string | null;
}
