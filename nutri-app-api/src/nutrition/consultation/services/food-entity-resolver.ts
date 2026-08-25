import { Injectable } from '@nestjs/common';
import { FoodsService } from '../../foods/services/foods.service.js';
import { FoodQueryNormalizationService } from '../../foods/services/food-query-normalization.service.js';
import { normalizeFoodSearchText } from '../../foods/services/food-presentation.service.js';
import { RecipesService } from '../../recipes/services/recipes.service.js';
import type { FoodSummarySource } from '../../foods/sources/food-summary.source.js';
import type {
  FoodEntityCandidate,
  FoodEntityConfidence,
  FoodEntityMatchType,
  FoodEntityResolution,
} from '../types/food-entity-resolution.type.js';

const MAX_FOOD_RESULTS_PER_PHRASE = 10;
const MAX_CANDIDATES = 5;

interface RankedCandidate {
  readonly candidate: FoodEntityCandidate;
  readonly phraseIndex: number;
  readonly resultIndex: number;
}

@Injectable()
export class FoodEntityResolver {
  constructor(
    private readonly foodsService: FoodsService,
    private readonly recipesService: RecipesService,
    private readonly queryNormalizationService: FoodQueryNormalizationService = new FoodQueryNormalizationService(),
  ) {}

  async resolve(userId: string, question: string): Promise<FoodEntityResolution> {
    const phrases = this.queryNormalizationService.extractCandidatePhrases(question);
    if (phrases.length === 0) {
      return { status: 'not-found', query: question, candidates: [] };
    }

    const candidates = await this.findFoodCandidates(phrases, isComparisonQuestion(question));
    const recipeCandidates = candidates.length === 0
      ? await this.findApprovedRecipeCandidates(userId, phrases)
      : [];
    const allCandidates = [...candidates, ...recipeCandidates].slice(0, MAX_CANDIDATES);

    if (allCandidates.length === 0) {
      return { status: 'not-found', query: question, candidates: [] };
    }

    const highConfidence = allCandidates.filter((item) => item.confidence === 'high');
    const status = highConfidence.length === 1 && allCandidates[0] === highConfidence[0]
      ? 'resolved'
      : allCandidates.length > 1
        ? 'ambiguous'
        : 'not-found';

    return {
      status,
      query: question,
      candidates: allCandidates,
      ...(status === 'ambiguous' ? {
        clarification: {
          message: 'Please choose the food or approved recipe you mean.',
          choices: (highConfidence.length > 1 ? highConfidence : allCandidates).slice(0, MAX_CANDIDATES),
        },
      } : {}),
    };
  }

  private async findFoodCandidates(
    phrases: readonly string[],
    collectAllConfidentMatches = false,
  ): Promise<FoodEntityCandidate[]> {
    const ranked = await this.searchPhrases(phrases, collectAllConfidentMatches, false);
    if (ranked.length > 0) return ranked;

    // Fuzzy matching is a bounded fallback only after the existing exact,
    // alias, and prefix search found no candidate. This keeps normal search
    // ranking authoritative and prevents typo correction from broadening a
    // confident query into an unrelated result set.
    const fuzzyPhrases = phrases.flatMap((phrase) =>
      this.queryNormalizationService.typoVariants(phrase),
    );
    if (fuzzyPhrases.length === 0) return [];

    return this.searchPhrases(
      fuzzyPhrases,
      collectAllConfidentMatches,
      true,
      phrases,
    );
  }

  private async searchPhrases(
    phrases: readonly string[],
    collectAllConfidentMatches: boolean,
    fuzzy: boolean,
    originalPhrases: readonly string[] = phrases,
  ): Promise<FoodEntityCandidate[]> {
    const ranked: RankedCandidate[] = [];
    const seen = new Set<string>();

    for (const [phraseIndex, phrase] of phrases.entries()) {
      const result = await this.foodsService.findMany({
        page: 1,
        limit: MAX_FOOD_RESULTS_PER_PHRASE,
        search: phrase,
      });

      result.items.forEach((food, resultIndex) => {
        if (seen.has(food.id)) return;
        const comparisonPhrases = fuzzy ? originalPhrases : [phrase];
        const match = comparisonPhrases
          .map((comparisonPhrase) => classifyFoodMatch(food, comparisonPhrase, fuzzy))
          .find((candidateMatch) => candidateMatch != null);
        if (match == null) return;
        seen.add(food.id);
        ranked.push({
          candidate: {
            kind: 'food',
            stableId: food.id,
            foodId: food.id,
            displayName: food.displayName ?? food.name,
            variantLabel: food.variantLabel ?? null,
            matchType: match.matchType,
            confidence: match.confidence,
          },
          phraseIndex,
          resultIndex,
        });
      });

      if (!collectAllConfidentMatches && ranked.some((item) => item.candidate.confidence === 'high')) break;
    }

    return ranked
      .sort((left, right) => left.phraseIndex - right.phraseIndex || left.resultIndex - right.resultIndex)
      .map(({ candidate }) => candidate)
      .slice(0, MAX_CANDIDATES);
  }

  private async findApprovedRecipeCandidates(
    userId: string,
    phrases: readonly string[],
  ): Promise<FoodEntityCandidate[]> {
    const recipes = await this.recipesService.findMany(userId);
    const normalizedPhrases = new Set(phrases.map(normalizeFoodSearchText));
    const candidates: FoodEntityCandidate[] = [];

    for (const recipe of recipes) {
      for (const version of recipe.versions) {
        if (version.approvalStatus !== 'APPROVED') continue;
        if (!normalizedPhrases.has(normalizeFoodSearchText(version.name))) continue;
        candidates.push({
          kind: 'approved-recipe',
          stableId: version.id,
          recipeId: recipe.id,
          recipeVersionId: version.id,
          displayName: version.name,
          variantLabel: version.cuisine,
          matchType: 'recipe-exact',
          confidence: 'high',
        });
      }
    }

    return candidates.slice(0, MAX_CANDIDATES);
  }
}

function isComparisonQuestion(question: string): boolean {
  return /\b(?:between|compare|versus|vs|pagitan)\b/i.test(question);
}

function classifyFoodMatch(
  food: FoodSummarySource,
  phrase: string,
  allowFuzzy = false,
): { matchType: FoodEntityMatchType; confidence: FoodEntityConfidence } | null {
  const query = normalizeFoodSearchText(phrase);
  const displayName = normalizeFoodSearchText(food.displayName ?? food.name);
  const canonicalName = normalizeFoodSearchText(food.name);
  const aliases = (food.searchAliases ?? []).map(normalizeFoodSearchText);

  if (displayName === query) return { matchType: 'display-exact', confidence: 'high' };
  if (aliases.some((alias) => alias === query)) return { matchType: 'alias-exact', confidence: 'high' };
  if (canonicalName === query) return { matchType: 'canonical-exact', confidence: 'high' };
  if (displayName.startsWith(`${query} `)) return { matchType: 'display-prefix', confidence: 'medium' };
  if (aliases.some((alias) => alias.startsWith(`${query} `))) return { matchType: 'alias-prefix', confidence: 'medium' };
  if (canonicalName.startsWith(`${query} `)) return { matchType: 'canonical-prefix', confidence: 'medium' };

  if (!allowFuzzy) return null;
  const distance = Math.min(
    editDistance(query, displayName),
    editDistance(query, canonicalName),
    ...aliases.map((alias) => editDistance(query, alias)),
  );
  return distance <= 1
    ? { matchType: 'fuzzy', confidence: 'high' }
    : null;
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0]!;
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex]!;
      previous[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? diagonal
        : Math.min(diagonal, previous[rightIndex - 1]!, above) + 1;
      diagonal = above;
    }
  }

  return previous[right.length]!;
}
