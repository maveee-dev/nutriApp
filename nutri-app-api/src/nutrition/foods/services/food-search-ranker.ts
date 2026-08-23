import type { FoodSummarySource } from '../sources/food-summary.source.js';
import {
  isModifierOnlyDisplayNameMatch,
  isPrimaryConceptDisplayNameMatch,
  isSpecificFoodVariantQuery,
  normalizeFoodSearchText,
} from './food-presentation.service.js';

type RankedFood = { food: FoodSummarySource; tier: number };

function startsWithToken(value: string, query: string): boolean {
  return value.split(' ').some((token) => token.startsWith(query));
}

function applySpecialtyDemotion(
  food: FoodSummarySource,
  query: string,
  tier: number,
): number {
  // A broad search such as "egg" should not let a specialty record with the
  // same derived display name outrank ordinary foods. Once the user includes
  // a variant term ("frozen", "duck", etc.), the normal match tiers apply.
  if (
    (food.searchPriority ?? 0) < 0 &&
    !isSpecificFoodVariantQuery(query) &&
    tier <= 6
  )
    return 7;
  return tier;
}

function applyModifierOnlyDemotion(
  displayName: string,
  query: string,
  tier: number,
): number {
  if (
    (tier === 3 || tier === 6) &&
    isModifierOnlyDisplayNameMatch(displayName, query)
  )
    return 6;
  return tier;
}

function matchTier(food: FoodSummarySource, query: string): number {
  const normalizedQuery = normalizeFoodSearchText(query);
  const displayName = normalizeFoodSearchText(food.displayName ?? food.name);
  const canonicalName = normalizeFoodSearchText(food.name);
  const aliases = (food.searchAliases ?? []).map(normalizeFoodSearchText);

  if (displayName === normalizedQuery)
    return applySpecialtyDemotion(food, normalizedQuery, 1);
  if (aliases.some((alias) => alias === normalizedQuery))
    return applySpecialtyDemotion(food, normalizedQuery, 2);
  if (displayName.startsWith(normalizedQuery))
    return applyModifierOnlyDemotion(
      displayName,
      normalizedQuery,
      applySpecialtyDemotion(food, normalizedQuery, 3),
    );
  if (aliases.some((alias) => alias.startsWith(normalizedQuery)))
    return applySpecialtyDemotion(food, normalizedQuery, 4);
  if (isPrimaryConceptDisplayNameMatch(displayName, normalizedQuery))
    return applySpecialtyDemotion(food, normalizedQuery, 4);
  if (canonicalName.startsWith(normalizedQuery))
    return applySpecialtyDemotion(food, normalizedQuery, 5);
  if (
    startsWithToken(displayName, normalizedQuery) ||
    aliases.some((alias) => startsWithToken(alias, normalizedQuery))
  )
    return applySpecialtyDemotion(food, normalizedQuery, 6);
  if (canonicalName.includes(normalizedQuery)) return 7;
  if (normalizeFoodSearchText(food.description ?? '').includes(normalizedQuery))
    return 8;
  return 9;
}

export function rankFoodSearchResults(
  foods: readonly FoodSummarySource[],
  query: string,
): FoodSummarySource[] {
  return foods
    .map((food): RankedFood => ({ food, tier: matchTier(food, query) }))
    .sort(
      (left, right) =>
        left.tier - right.tier ||
        (right.food.searchPriority ?? 0) - (left.food.searchPriority ?? 0) ||
        (left.food.displayName ?? left.food.name).length -
          (right.food.displayName ?? right.food.name).length ||
        (left.food.displayName ?? left.food.name).localeCompare(
          right.food.displayName ?? right.food.name,
        ) ||
        left.food.name.localeCompare(right.food.name) ||
        left.food.id.localeCompare(right.food.id),
    )
    .map(({ food }) => food);
}
