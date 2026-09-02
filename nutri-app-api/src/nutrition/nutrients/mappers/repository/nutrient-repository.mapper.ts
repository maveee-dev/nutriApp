import { Nutrient as PrismaNutrient } from "../../../../../generated/prisma/client.js";
import { NutrientSource } from "../../sources/nutrient.source.js";

export function toNutrientSource(
  row: PrismaNutrient,
): NutrientSource {
  return {
    id: row.id,
    sourceId: row.sourceId,
    name: row.name,
    unit: row.unit,
    description: row.description,
  }
}
