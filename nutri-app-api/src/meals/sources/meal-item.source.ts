import { DecimalValue } from "../../common/types/decimal-value.type.js";
import { MealItemFoodSource } from "./meal-item-food.source.js";
import { MealItemServingSource } from "./meal-item-serving.source.js";

export interface MealItemSource {
  id: string;
  food: MealItemFoodSource,
  serving: MealItemServingSource,
  quantity: DecimalValue; 
}