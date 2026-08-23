import type { RecipeSource } from '../../types/recipe.source.js';
import type { RecipeWithDetails } from '../../repositories/recipe.prisma.js';
import { normalizeServingDisplayName, resolveFoodPresentation } from '../../../foods/services/food-presentation.service.js';

export function toRecipeSource(row: RecipeWithDetails, includeUnapprovedVersions = true): RecipeSource {
  return {
    id: row.id,
    ownerId: row.ownerId,
    visibility: row.visibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    versions: row.versions.filter((version) => includeUnapprovedVersions || version.approvalStatus === 'APPROVED').map((version) => ({
      id: version.id,
      recipeId: version.recipeId,
      version: version.version,
      name: version.name,
      description: version.description,
      cuisine: version.cuisine,
      mealTypes: version.mealTypes,
      yieldServings: version.yieldServings.toString(),
      sourceType: version.sourceType,
      sourceName: version.sourceName,
      sourceUrl: version.sourceUrl,
      sourceReference: version.sourceReference,
      sourceVersion: version.sourceVersion,
      approvalStatus: version.approvalStatus,
      approvedAt: version.approvedAt,
      approvedByUserId: version.approvedByUserId,
      createdAt: version.createdAt,
      components: version.components.map((component) => {
        const presentation = resolveFoodPresentation(component.food.name, component.food.presentation == null ? null : {
          displayNameOverride: component.food.presentation.displayNameOverride,
          variantLabelOverride: component.food.presentation.variantLabelOverride,
          searchPriority: component.food.presentation.searchPriority,
          aliases: component.food.presentation.aliases,
        });
        return {
          id: component.id,
          foodId: component.foodId,
          foodName: component.food.name,
          foodDisplayName: presentation.displayName,
          foodVariantLabel: presentation.variantLabel,
          servingId: component.servingId,
          servingName: component.serving == null ? null : normalizeServingDisplayName(component.serving.name, presentation.displayName),
          servingGrams: component.serving?.grams.toString() ?? null,
          role: component.role,
          quantity: component.quantity.toString(),
          unit: component.unit,
          displayOrder: component.displayOrder,
          notes: component.notes,
        };
      }),
    })),
  };
}
