import type { MealTemplateSource } from '../../types/meal-template.source.js';
import type { MealTemplateWithDetails } from '../../repositories/meal-template.prisma.js';

export function toMealTemplateSource(row: MealTemplateWithDetails, includeUnapprovedVersions = true): MealTemplateSource {
  return {
    id: row.id,
    ownerId: row.ownerId,
    visibility: row.visibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    versions: row.versions.filter((version) => includeUnapprovedVersions || version.approvalStatus === 'APPROVED').map((version) => ({
      id: version.id,
      version: version.version,
      name: version.name,
      description: version.description,
      cuisine: version.cuisine,
      mealTypes: version.mealTypes,
      sourceType: version.sourceType,
      sourceName: version.sourceName,
      sourceUrl: version.sourceUrl,
      sourceReference: version.sourceReference,
      sourceVersion: version.sourceVersion,
      approvalStatus: version.approvalStatus,
      approvedAt: version.approvedAt,
      approvedByUserId: version.approvedByUserId,
      createdAt: version.createdAt,
      slots: version.slots.map((slot) => ({
        id: slot.id,
        role: slot.role,
        kind: slot.kind,
        name: slot.name,
        required: slot.required,
        allowCanonicalFoodFallback: slot.allowCanonicalFoodFallback,
        displayOrder: slot.displayOrder,
        recipeVersionId: slot.recipeVersionId,
        recipeId: slot.recipeVersion?.recipeId ?? null,
        recipeName: slot.recipeVersion?.name ?? null,
        recipeVersion: slot.recipeVersion?.version ?? null,
        foodId: slot.foodId,
        foodName: slot.food?.name ?? null,
        servingId: slot.servingId,
        servingName: slot.serving?.name ?? null,
        quantity: slot.quantity?.toString() ?? null,
        unit: slot.unit,
        notes: slot.notes,
      })),
    })),
  };
}
