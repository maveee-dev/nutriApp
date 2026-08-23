import { toFoodCategorySource } from "../../../categories/mappers/repository/food-category-repository.mapper.js";
import { toServingSource } from "../../../servings/mappers/repository/serving-repository.mapper.js";
import { toNutrientSource } from "../../../nutrients/mappers/repository/nutrient-repository.mapper.js";
import { FoodDetailSource } from "../../sources/food-detail.source.js";
import { FoodSummarySource } from "../../sources/food-summary.source.js";
import { FoodWithCategory, FoodWithRelations } from '../../repositories/food.prisma.js';
import { normalizeServingDisplayName, resolveFoodPresentation } from '../../services/food-presentation.service.js';

function presentationMetadata(row: { presentation?: { displayNameOverride: string | null; variantLabelOverride: string | null; searchPriority: number; aliases: readonly { alias: string }[] } | null }) {
  return row.presentation == null ? null : {
    displayNameOverride: row.presentation.displayNameOverride,
    variantLabelOverride: row.presentation.variantLabelOverride,
    searchPriority: row.presentation.searchPriority,
    aliases: row.presentation.aliases,
  };
}

export function tofoodDetailSource(
  row: FoodWithRelations,
): FoodDetailSource {
  const presentation = resolveFoodPresentation(row.name, presentationMetadata(row));
  return {
    id: row.id,
    source: row.source,
    sourceId: row.sourceId,
    name: row.name,
    displayName: presentation.displayName,
    variantLabel: presentation.variantLabel,
    planningClass: row.planningClass,
    category: toFoodCategorySource(row.category),
    servings: row.servings.map((serving) => ({
      ...toServingSource(serving),
      name: normalizeServingDisplayName(serving.name, presentation.displayName),
    })),
    nutrients: 
      row.nutrients.map((foodNutrient) => ({
        nutrient:
          toNutrientSource(foodNutrient.nutrient),

        amount:
          foodNutrient.amount.toString(),
      })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toFoodSummarySource(
  row: FoodWithCategory,
): FoodSummarySource {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ...(() => {
      const presentation = resolveFoodPresentation(row.name, presentationMetadata(row));
      return {
        displayName: presentation.displayName,
        variantLabel: presentation.variantLabel,
        searchPriority: presentation.searchPriority,
        searchAliases: presentation.aliases,
      };
    })(),
    planningClass: row.planningClass,
    category: toFoodCategorySource(row.category),
  };
}
