import { Serving as PrismaServing } from "../../../../../generated/prisma/client.js";
import { ServingSource } from "../../sources/serving.source.js";

export function toServingSource(
  row: PrismaServing,
): ServingSource {
  return {
    id: row.id,
    name: row.name,
    grams: row.grams.toString(),
  };
}