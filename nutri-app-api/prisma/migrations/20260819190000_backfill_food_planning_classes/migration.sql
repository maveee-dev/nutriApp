UPDATE "Food" AS f
SET "planningClass" = 'ALCOHOL'
FROM "FoodCategory" AS c
WHERE f."categoryId" = c.id
  AND (f.name || ' ' || c.name) ~* '(^|[^a-z])(beer|ale|lager|wine|vodka|whiskey|whisky|rum|gin|tequila|liquor|alcohol|cider)([^a-z]|$)';

UPDATE "Food" AS f
SET "planningClass" = 'CONDIMENT'
FROM "FoodCategory" AS c
WHERE f."categoryId" = c.id
  AND f."planningClass" = 'MEAL_ELIGIBLE'
  AND (f.name || ' ' || c.name) ~* '(^|[^a-z])(sauce|ketchup|mustard|mayonnaise|mayo|dressing|gravy|condiment|spice|spices|seasoning|vinegar|relish|salt|pepper)([^a-z]|$)';

UPDATE "Food" AS f
SET "planningClass" = 'INGREDIENT'
FROM "FoodCategory" AS c
WHERE f."categoryId" = c.id
  AND f."planningClass" = 'MEAL_ELIGIBLE'
  AND (f.name || ' ' || c.name) ~* '(^|[^a-z])(ingredient|flour|starch|cornstarch|baking powder|raw material|shortening)([^a-z]|$)';

UPDATE "Food" AS f
SET "planningClass" = 'BEVERAGE_ONLY'
FROM "FoodCategory" AS c
WHERE f."categoryId" = c.id
  AND f."planningClass" = 'MEAL_ELIGIBLE'
  AND (f.name || ' ' || c.name) ~* '(^|[^a-z])(beverage|beverages|drink|drinks|juice|soda|coffee|tea|water)([^a-z]|$)';

UPDATE "Food" AS f
SET "planningClass" = 'DESSERT'
FROM "FoodCategory" AS c
WHERE f."categoryId" = c.id
  AND f."planningClass" = 'MEAL_ELIGIBLE'
  AND (f.name || ' ' || c.name) ~* '(^|[^a-z])(dessert|desserts|cake|cookie|candy|pie|pudding|ice cream)([^a-z]|$)';

UPDATE "Food" AS f
SET "planningClass" = 'SNACK'
FROM "FoodCategory" AS c
WHERE f."categoryId" = c.id
  AND f."planningClass" = 'MEAL_ELIGIBLE'
  AND (f.name || ' ' || c.name) ~* '(^|[^a-z])(snack|snacks|chips|popcorn|cracker|crackers)([^a-z]|$)';
