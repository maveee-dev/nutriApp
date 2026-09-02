import type { FoodSummarySource } from '../sources/food-summary.source.js';
import type { FoodSearchRankingContext } from '../types/food-search-ranking-context.type.js';
import {
  isIdentityQualifiedDisplayName,
  isModifierOnlyDisplayNameMatch,
  isPrimaryConceptDisplayNameMatch,
  isSpecificFoodVariantQuery,
  foodSearchTokensMatch,
  normalizeFoodSearchText,
  normalizeFoodSearchTokens,
} from './food-presentation.service.js';

type RankedFood = { food: FoodSummarySource; tier: number };

const FOOD_RECOGNITION_SPECIALTY_PENALTY = 0.5;
const RECOGNITION_SPECIALTY_CATEGORY_PATTERN = /\b(?:baby\s+foods?|infant|toddlers?|medical\s+foods?|therapeutic\s+products?|dietary\s+supplements?)\b/i;

function startsWithToken(value: string, query: string): boolean {
  return value.split(' ').some((token) => token.startsWith(query));
}

function allQueryTokensMatch(query: string, value: string): boolean {
  const queryTokens = normalizeFoodSearchTokens(query);
  const valueTokens = normalizeFoodSearchTokens(value);
  return (
    queryTokens.length > 0 &&
    queryTokens.every((queryToken) =>
      valueTokens.some((valueToken) =>
        foodSearchTokensMatch(queryToken, valueToken),
      ),
    )
  );
}

function anyAliasMatches(query: string, aliases: readonly string[]): boolean {
  return aliases.some((alias) => allQueryTokensMatch(query, alias));
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
  if (isIdentityQualifiedDisplayName(displayName, normalizedQuery))
    // The query is an exact token in the display title, but not its first
    // token. Keep it below exact display/alias matches and above a mere
    // prefix such as "milk" -> "Milkfish".
    return applySpecialtyDemotion(food, normalizedQuery, 2.5);
  if (isPrimaryConceptDisplayNameMatch(displayName, normalizedQuery))
    return applySpecialtyDemotion(food, normalizedQuery, 4);
  if (allQueryTokensMatch(normalizedQuery, displayName))
    return applyModifierOnlyDemotion(
      displayName,
      normalizedQuery,
      applySpecialtyDemotion(food, normalizedQuery, 4),
    );
  if (anyAliasMatches(normalizedQuery, aliases))
    return applySpecialtyDemotion(food, normalizedQuery, 4);
  if (canonicalName.startsWith(normalizedQuery))
    return applySpecialtyDemotion(food, normalizedQuery, 5);
  if (
    startsWithToken(displayName, normalizedQuery) ||
    aliases.some((alias) => startsWithToken(alias, normalizedQuery))
  )
    return applySpecialtyDemotion(food, normalizedQuery, 6);
  if (allQueryTokensMatch(normalizedQuery, food.variantLabel ?? ''))
    return 6;
  if (allQueryTokensMatch(normalizedQuery, canonicalName)) return 7;
  if (canonicalName.includes(normalizedQuery)) return 7;
  if (normalizeFoodSearchText(food.description ?? '').includes(normalizedQuery))
    return 8;
  return 9;
}

function recognitionSearchPriority(
  food: FoodSummarySource,
  rankingContext: FoodSearchRankingContext,
): number {
  const basePriority = food.searchPriority ?? 0;
  if (rankingContext !== 'food-recognition') return basePriority;

  const categoryText = `${food.category.name} ${food.category.description ?? ''}`;
  return RECOGNITION_SPECIALTY_CATEGORY_PATTERN.test(categoryText)
    ? basePriority - FOOD_RECOGNITION_SPECIALTY_PENALTY
    : basePriority;
}

export function rankFoodSearchResults(
  foods: readonly FoodSummarySource[],
  query: string,
  rankingContext: FoodSearchRankingContext = 'catalog',
): FoodSummarySource[] {
  return foods
    .map((food): RankedFood => ({ food, tier: matchTier(food, query) }))
    .sort(
      (left, right) =>
        left.tier - right.tier ||
        recognitionSearchPriority(right.food, rankingContext) -
          recognitionSearchPriority(left.food, rankingContext) ||
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

/**
 * Reorders a ranked catalog result set so the first requested page contains
 * one representative for each display concept where possible. Deferred
 * variants retain their original relative order and remain available on
 * later pages. This is intentionally separate from ranking and is not used
 * for recognition, where ambiguity must remain visible.
 */
export function diversifyFoodSearchResults(
  rankedFoods: readonly FoodSummarySource[],
  pageSize: number,
): FoodSummarySource[] {
  if (pageSize <= 0 || rankedFoods.length <= 1) return [...rankedFoods];

  const representatives: FoodSummarySource[] = [];
  const deferred: FoodSummarySource[] = [];
  const concepts = new Set<string>();

  for (const food of rankedFoods) {
    const concept = normalizeFoodSearchText(food.displayName ?? food.name);
    if (representatives.length < pageSize && !concepts.has(concept)) {
      concepts.add(concept);
      representatives.push(food);
    } else {
      deferred.push(food);
    }
  }

  return [...representatives, ...deferred];
}
