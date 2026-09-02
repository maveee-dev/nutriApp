import type { UpdateProfileData } from '../../profiles/types/update-profile.data.js';
import type { UpdateDialysisStatusInput } from '../../dialysis/types/update-dialysis-status.input.js';

export interface UserAllergyInput {
  readonly name: string;
  readonly reaction?: string;
  readonly notes?: string;
}

export interface UserMedicationInput {
  readonly name: string;
  readonly dosage?: string;
  readonly frequency?: string;
  readonly notes?: string;
}

export interface UpdateHealthProfileInput {
  readonly personal?: UpdateProfileData;
  readonly dialysis?: UpdateDialysisStatusInput;
  readonly conditionIds?: readonly string[];
  readonly allergies?: readonly UserAllergyInput[];
  readonly medications?: readonly UserMedicationInput[];
}
