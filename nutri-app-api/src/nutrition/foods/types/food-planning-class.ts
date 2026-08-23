export type FoodPlanningClass =
  | 'MEAL_ELIGIBLE'
  | 'BEVERAGE_ONLY'
  | 'CONDIMENT'
  | 'INGREDIENT'
  | 'ALCOHOL'
  | 'DESSERT'
  | 'SNACK';

export function classifyFoodPlanningClass(name: string, categoryName: string): FoodPlanningClass {
  const value = `${name} ${categoryName}`.toLowerCase();

  if (/\b(beer|ale|lager|wine|vodka|whiskey|whisky|rum|gin|tequila|liquor|alcohol|cider)\b/.test(value)) return 'ALCOHOL';
  if (/\b(sauce|ketchup|mustard|mayonnaise|mayo|dressing|gravy|condiment|spice|seasoning|vinegar|relish)\b/.test(value)) return 'CONDIMENT';
  if (/\b(ingredient|flour|starch|raw material)\b/.test(value)) return 'INGREDIENT';
  if (/\b(beverage|drink|juice|soda|coffee|tea|water)\b/.test(value)) return 'BEVERAGE_ONLY';
  if (/\b(dessert|cake|cookie|candy|pie|pudding|ice cream)\b/.test(value)) return 'DESSERT';
  if (/\b(snack|chips|popcorn|cracker)\b/.test(value)) return 'SNACK';

  return 'MEAL_ELIGIBLE';
}
