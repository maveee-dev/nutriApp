export type Sex = 'MALE' | 'FEMALE';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
export type DialysisStatus = 'ACTIVE' | 'INACTIVE';

export interface UserProfile {
  id: string;
  userId: string;
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  age?: number;
  sex?: Sex;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
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
  effectiveAt: string | null;
  reportedAt: string;
  updatedAt: string;
}

export interface UpdateDialysisStatusRequest {
  status: DialysisStatus;
  effectiveAt?: string;
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
