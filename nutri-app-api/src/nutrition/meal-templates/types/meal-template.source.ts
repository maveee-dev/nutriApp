import type { MealTemplateApprovalStatus, MealTemplateSlotKind, MealTemplateSlotRole, MealTemplateSourceType, MealTemplateVisibility, RecipeQuantityUnit } from '../../../../generated/prisma/client.js';

export interface MealTemplateSlotSource {
  readonly id: string;
  readonly role: MealTemplateSlotRole;
  readonly kind: MealTemplateSlotKind;
  readonly name: string;
  readonly required: boolean;
  readonly allowCanonicalFoodFallback: boolean;
  readonly displayOrder: number;
  readonly recipeId: string | null;
  readonly recipeVersionId: string | null;
  readonly recipeName: string | null;
  readonly recipeVersion: number | null;
  readonly foodId: string | null;
  readonly foodName: string | null;
  readonly servingId: string | null;
  readonly servingName: string | null;
  readonly quantity: string | null;
  readonly unit: RecipeQuantityUnit | null;
  readonly notes: string | null;
}

export interface MealTemplateVersionSource {
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly description: string | null;
  readonly cuisine: string | null;
  readonly mealTypes: readonly string[];
  readonly sourceType: MealTemplateSourceType;
  readonly sourceName: string | null;
  readonly sourceUrl: string | null;
  readonly sourceReference: string | null;
  readonly sourceVersion: string | null;
  readonly approvalStatus: MealTemplateApprovalStatus;
  readonly approvedAt: Date | null;
  readonly approvedByUserId: string | null;
  readonly createdAt: Date;
  readonly slots: readonly MealTemplateSlotSource[];
}

export interface MealTemplateSource {
  readonly id: string;
  readonly ownerId: string | null;
  readonly visibility: MealTemplateVisibility;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly versions: readonly MealTemplateVersionSource[];
}
