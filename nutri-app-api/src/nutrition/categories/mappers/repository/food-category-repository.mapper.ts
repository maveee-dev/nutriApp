import { FoodCategory as PrismaFoodCategory } from "../../../../../generated/prisma/client.js";
import { FoodCategorySource } from "../../sources/food-category.source.js";

export function toFoodCategorySource(
  row: PrismaFoodCategory,
): FoodCategorySource {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
  };
}