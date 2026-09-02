export type IndividualizedNutritionTargetEvidenceKind = 'upper-limit' | 'lower-target' | 'range';
export type IndividualizedNutritionTargetApprovalStatus = 'SUGGESTED' | 'APPROVED' | 'DISMISSED';

/**
 * Domain representation of immutable numeric target evidence. The source is
 * intentionally nutrient-agnostic so future numeric targets can reuse it.
 */
export interface IndividualizedNutritionTargetEvidence {
  readonly id: string;
  readonly userId: string;
  readonly nutrientKey: string;
  readonly kind: IndividualizedNutritionTargetEvidenceKind;
  readonly targetValue: string | null;
  readonly unit: string;
  readonly approvalSource: string;
  readonly approvalStatus?: IndividualizedNutritionTargetApprovalStatus;
  readonly sourceReference: string | null;
  readonly effectiveAt: Date;
  readonly approvedAt: Date;
  readonly expiresAt: Date | null;
  readonly version: number;
  readonly rangeMin: string | null;
  readonly rangeMax: string | null;
  readonly notes: string | null;
}

export interface CreateIndividualizedNutritionTargetEvidenceInput {
  readonly userId: string;
  readonly nutrientKey: string;
  readonly kind: IndividualizedNutritionTargetEvidenceKind;
  readonly targetValue?: string | null;
  readonly unit: string;
  readonly approvalSource: string;
  readonly approvalStatus?: IndividualizedNutritionTargetApprovalStatus;
  readonly sourceReference?: string | null;
  readonly effectiveAt: Date;
  readonly approvedAt: Date;
  readonly expiresAt?: Date | null;
  readonly version: number;
  readonly rangeMin?: string | null;
  readonly rangeMax?: string | null;
  readonly notes?: string | null;
}
