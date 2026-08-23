import type { RecipeApprovalStatus, RecipeComponentRole, RecipeQuantityUnit, RecipeSourceType, RecipeVisibility } from '../../../../generated/prisma/client.js';

export interface RecipeComponentSource {
  readonly id: string;
  readonly foodId: string;
  readonly foodName: string;
  readonly servingId: string | null;
  readonly servingName: string | null;
  readonly servingGrams: string | null;
  readonly role: RecipeComponentRole;
  readonly quantity: string;
  readonly unit: RecipeQuantityUnit;
  readonly displayOrder: number;
  readonly notes: string | null;
}

export interface RecipeVersionSource {
  readonly id: string;
  /** Parent Recipe identity; retained separately from this immutable version identity. */
  readonly recipeId?: string;
  readonly version: number;
  readonly name: string;
  readonly description: string | null;
  readonly cuisine: string | null;
  readonly mealTypes: readonly string[];
  readonly yieldServings: string;
  readonly sourceType: RecipeSourceType;
  readonly sourceName: string | null;
  readonly sourceUrl: string | null;
  readonly sourceReference: string | null;
  readonly sourceVersion: string | null;
  readonly approvalStatus: RecipeApprovalStatus;
  readonly approvedAt: Date | null;
  readonly approvedByUserId: string | null;
  readonly createdAt: Date;
  readonly components: readonly RecipeComponentSource[];
}

export interface RecipeSource {
  readonly id: string;
  readonly ownerId: string | null;
  readonly visibility: RecipeVisibility;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly versions: readonly RecipeVersionSource[];
}
