import { NutrientSource } from "./nutrient.source.js";

export interface FoodNutrientSource {
  readonly nutrient: NutrientSource;
  readonly amount: string;
}