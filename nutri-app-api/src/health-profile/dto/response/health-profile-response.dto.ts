import type { ProfileResponseDto } from '../../../profiles/dto/response/profile-response.dto.js';
import type { UserConditionResponseDto } from '../../../conditions/dto/response/user-condition-response.dto.js';
import type { UserDialysisStatusResponseDto } from '../../../dialysis/dto/response/user-dialysis-status-response.dto.js';

export class HealthProfileAllergyResponseDto {
  id!: string;
  name!: string;
  reaction!: string | null;
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class HealthProfileMedicationResponseDto {
  id!: string;
  name!: string;
  dosage!: string | null;
  frequency!: string | null;
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class HealthProfileNutritionTargetResponseDto {
  id!: string;
  nutrient!: string;
  value!: string | null;
  unit!: string;
  kind!: 'UPPER_LIMIT' | 'LOWER_TARGET' | 'RANGE';
  source!: 'CLINICIAN' | 'USER' | 'SYSTEM_SUGGESTED' | 'IMPORTED';
  approvalStatus!: 'SUGGESTED' | 'APPROVED' | 'DISMISSED' | 'EXPIRED';
  effectiveAt!: Date;
  expirationAt!: Date | null;
  version!: number;
  notes!: string | null;
  rangeMin!: string | null;
  rangeMax!: string | null;
}

export class HealthProfileResponseDto {
  personal!: ProfileResponseDto | null;
  conditions!: UserConditionResponseDto[];
  dialysis!: UserDialysisStatusResponseDto | null;
  allergies!: HealthProfileAllergyResponseDto[];
  medications!: HealthProfileMedicationResponseDto[];
  nutritionTargets!: HealthProfileNutritionTargetResponseDto[];
}
