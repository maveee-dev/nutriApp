export type Sex = 'MALE' | 'FEMALE';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
export type DialysisStatus = 'ACTIVE' | 'INACTIVE';
export type DialysisModality = 'UNKNOWN' | 'HEMODIALYSIS' | 'PERITONEAL_DIALYSIS' | 'CONFLICTING';
export type SelectableDialysisModality = Exclude<DialysisModality, 'UNKNOWN' | 'CONFLICTING'>;

export interface UserProfile {
  id: string;
  userId: string;
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  nutritionGoal?: 'WEIGHT_LOSS' | 'WEIGHT_MAINTENANCE' | 'WEIGHT_GAIN' | 'GENERAL_HEALTH' | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  age?: number;
  sex?: Sex;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
  nutritionGoal?: UserProfile['nutritionGoal'];
}

export interface Condition {
  id: string;
  name: string;
  description: string | null;
}

export interface UserCondition {
  createdAt: string;
  condition: Condition;
}

export interface UserDialysisStatus {
  status: DialysisStatus;
  modality: DialysisModality;
  frequency: string | null;
  schedule: string | null;
  effectiveAt: string | null;
  reportedAt: string;
  updatedAt: string;
}

export interface UpdateDialysisStatusRequest {
  status: DialysisStatus;
  modality?: SelectableDialysisModality;
  effectiveAt?: string | null;
  frequency?: string | null;
  schedule?: string | null;
}

export interface LaboratoryResult {
  id: string;
  testCode: string;
  value: string;
  unit: string;
  referenceLow: string | null;
  referenceHigh: string | null;
  collectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLaboratoryResultRequest {
  testCode: string;
  value: string;
  unit: string;
  referenceLow?: string;
  referenceHigh?: string;
  collectedAt: string;
}

export type NutritionTargetKind = 'UPPER_LIMIT' | 'LOWER_TARGET' | 'RANGE';
export type NutritionTargetSource = 'CLINICIAN' | 'USER' | 'SYSTEM_SUGGESTED' | 'IMPORTED';
export type NutritionTargetApprovalStatus = 'SUGGESTED' | 'APPROVED' | 'DISMISSED' | 'EXPIRED';

export interface NutritionTarget {
  id: string;
  nutrient: string;
  value: string | null;
  unit: string;
  kind: NutritionTargetKind;
  source: NutritionTargetSource;
  approvalStatus: NutritionTargetApprovalStatus;
  effectiveAt: string;
  expirationAt: string | null;
  version: number;
  notes: string | null;
  rangeMin: string | null;
  rangeMax: string | null;
}

export interface CreateNutritionTargetRequest {
  nutrient: string;
  value?: string;
  unit: string;
  kind: NutritionTargetKind;
  source: NutritionTargetSource;
  approvalStatus?: Exclude<NutritionTargetApprovalStatus, 'EXPIRED'>;
  effectiveAt: string;
  expirationAt?: string | null;
  notes?: string | null;
  rangeMin?: string | null;
  rangeMax?: string | null;
}

export type UpdateNutritionTargetRequest = Partial<Omit<CreateNutritionTargetRequest, 'nutrient'>>;

export interface HealthProfileAllergy {
  id: string;
  name: string;
  reaction: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HealthProfileMedication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HealthProfile {
  personal: UserProfile | null;
  conditions: UserCondition[];
  dialysis: UserDialysisStatus | null;
  allergies: HealthProfileAllergy[];
  medications: HealthProfileMedication[];
  nutritionTargets: NutritionTarget[];
}

export interface UpdateHealthProfileRequest {
  personal?: UpdateProfileRequest;
  dialysis?: UpdateDialysisStatusRequest;
  conditionIds?: string[];
  allergies?: Array<{ name: string; reaction?: string; notes?: string }>;
  medications?: Array<{ name: string; dosage?: string; frequency?: string; notes?: string }>;
}
