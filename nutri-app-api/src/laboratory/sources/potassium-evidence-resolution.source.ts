import { LaboratoryFindingSource } from './laboratory-finding.source.js';

export type PotassiumEvidenceFailureReason = 'no-potassium-found' | 'invalid-potassium-unit' | 'invalid-potassium-value';

export interface PotassiumEvidenceResolution {
  readonly finding: LaboratoryFindingSource | null;
  readonly failureReason: PotassiumEvidenceFailureReason | null;
  readonly failureExplanation: string | null;
}
