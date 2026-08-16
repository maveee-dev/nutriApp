import { DecimalValue } from "../../common/types/decimal-value.type.js";

export interface MealItemServingSource {
  id: string;
  name: string;
  grams: DecimalValue;
}