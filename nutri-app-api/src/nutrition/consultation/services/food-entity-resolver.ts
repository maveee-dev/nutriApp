import { Injectable } from '@nestjs/common';
import { FoodsService } from '../../foods/services/foods.service.js';
import { normalizeFoodSearchText } from '../../foods/services/food-presentation.service.js';
import { RecipesService } from '../../recipes/services/recipes.service.js';
import type { FoodSummarySource } from '../../foods/sources/food-summary.source.js';
import type { RecipeSource } from '../../recipes/types/recipe.source.js';
import type {
  FoodEntityCandidate,
  FoodEntityConfidence,
  FoodEntityMatchType,
  FoodEntityResolution,
} from '../types/food-entity-resolution.type.js';

const MAX_SEARCH_PHRASES = 6;
const MAX_FOOD_RESULTS_PER_PHRASE = 10;
const MAX_CANDIDATES = 5;

const CONVERSATIONAL_WORDS = new Set([
  'a', 'an', 'and', 'are', 'about', 'can', 'do', 'does', 'for', 'good',
  'healthy', 'high', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'okay', 'ok',
  'safe', 'tell', 'the', 'this', 'to', 'would', 'you', 'eat', 'eating',
  'increase', 'decrease', 'raise', 'lower', 'sugar', 'carbs', 'carbohydrates',
  'protein', 'healthy', 'food', 'foods', 'meal', 'meals', 'please', 'what',
  'which', 'between', 'compare', 'versus', 'vs', 'should', 'be', 'for',
  'someone', 'with', 'kidney', 'disease', 'diabetes', 'dialysis', 'ckd',
]);

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
  ) {}

  async resolve(userId: string, question: string): Promise<FoodEntityResolution> {
    const phrases = extractCandidatePhrases(question);
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
    };
  }

  private async findFoodCandidates(
    phrases: readonly string[],
    collectAllConfidentMatches = false,
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
        const match = classifyFoodMatch(food, phrase);
        if (match == null) return;
        seen.add(food.id);
        ranked.push({
          candidate: {
            kind: 'food',
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
  return /\b(?:between|compare|versus|vs)\b/i.test(question);
}

function extractCandidatePhrases(question: string): string[] {
  const normalized = normalizeFoodSearchText(question);
  const tokens = normalized
    .split(' ')
    .filter((token) => token.length > 1 && !CONVERSATIONAL_WORDS.has(token));

  if (tokens.length === 0) return [];

  const phrases: string[] = [];
  const add = (value: string) => {
    const phrase = value.trim();
    if (phrase.length > 1 && !phrases.includes(phrase)) phrases.push(phrase);
  };

  add(tokens.join(' '));
  for (let length = Math.min(tokens.length - 1, 3); length >= 1; length -= 1) {
    for (let start = 0; start + length <= tokens.length; start += 1) {
      add(tokens.slice(start, start + length).join(' '));
      if (phrases.length >= MAX_SEARCH_PHRASES) return phrases;
    }
  }

  return phrases.slice(0, MAX_SEARCH_PHRASES);
}

function classifyFoodMatch(
  food: FoodSummarySource,
  phrase: string,
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
  return null;
}
