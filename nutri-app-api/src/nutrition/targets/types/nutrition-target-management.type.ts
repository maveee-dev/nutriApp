export const NUTRITION_TARGET_SOURCES = ['CLINICIAN', 'USER', 'SYSTEM_SUGGESTED', 'IMPORTED'] as const;
export type NutritionTargetSource = (typeof NUTRITION_TARGET_SOURCES)[number];

export const NUTRITION_TARGET_KINDS = ['UPPER_LIMIT', 'LOWER_TARGET', 'RANGE'] as const;
export type NutritionTargetKind = (typeof NUTRITION_TARGET_KINDS)[number];

export const NUTRITION_TARGET_APPROVAL_STATUSES = ['SUGGESTED', 'APPROVED', 'DISMISSED'] as const;
export type NutritionTargetApprovalStatus = (typeof NUTRITION_TARGET_APPROVAL_STATUSES)[number];

export interface NutritionTargetManagementSource {
  readonly id: string;
  readonly userId: string;
  readonly nutrient: string;
  readonly value: string | null;
  readonly unit: string;
  readonly kind: NutritionTargetKind;
  readonly source: NutritionTargetSource;
  readonly approvalStatus: NutritionTargetApprovalStatus | 'EXPIRED';
  readonly effectiveAt: Date;
  readonly expirationAt: Date | null;
  readonly version: number;
  readonly notes: string | null;
  readonly rangeMin: string | null;
  readonly rangeMax: string | null;
}

export interface CreateNutritionTargetInput {
  readonly userId: string;
  readonly nutrient: string;
  readonly value?: string | null;
  readonly unit: string;
  readonly kind: NutritionTargetKind;
  readonly source: NutritionTargetSource;
  readonly approvalStatus: NutritionTargetApprovalStatus;
  readonly effectiveAt: Date;
  readonly expirationAt?: Date | null;
  readonly notes?: string | null;
  readonly rangeMin?: string | null;
  readonly rangeMax?: string | null;
}

export interface UpdateNutritionTargetInput {
  readonly value?: string | null;
  readonly unit?: string;
  readonly kind?: NutritionTargetKind;
  readonly source?: NutritionTargetSource;
  readonly approvalStatus?: NutritionTargetApprovalStatus;
  readonly effectiveAt?: Date;
  readonly expirationAt?: Date | null;
  readonly notes?: string | null;
  readonly rangeMin?: string | null;
  readonly rangeMax?: string | null;
}
