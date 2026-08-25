import { Injectable } from '@nestjs/common';
import { normalizeFoodSearchText } from './food-presentation.service.js';

const QUERY_STOP_WORDS = new Set([
  'a', 'about', 'an', 'and', 'ang', 'are', 'ba', 'be', 'between', 'can',
  'could', 'do', 'does', 'for', 'good', 'healthy', 'high', 'i', 'in', 'is',
  'it', 'kain', 'kainin', 'kumain', 'me', 'mga', 'my', 'na', 'ng', 'of',
  'okay', 'ok', 'please', 'safe', 'sa', 'should', 'tell', 'the', 'this',
  'to', 'what', 'which', 'with', 'would', 'you', 'eat', 'eating', 'food',
  'foods', 'meal', 'meals', 'increase', 'decrease', 'raise', 'lower',
  'sugar', 'carbs', 'carbohydrates', 'protein', 'someone', 'with', 'who',
  'kidney', 'disease', 'diabetes', 'dialysis', 'ckd', 'healthy', 'please',
  'pwede', 'puwede', 'maaari', 'ko', 'mo', 'ako', 'ito', 'iyon', 'ito',
  'ano', 'anong', 'mabuti', 'magandang', 'masama', 'lang', 'bang', 'kong',
  'kayo', 'natin', 'namin', 'sakin', 'saakin', 'ba',
]);

const PHRASE_ALIASES = new Map<string, readonly string[]>([
  ['adobo', ['adobo']],
  ['adobong manok', ['chicken adobo']],
  ['adobong baboy', ['pork adobo']],
  ['adobong baka', ['beef adobo']],
  ['adobong isda', ['fish adobo']],
  ['adobong kangkong', ['adobong kangkong']],
  ['homemade adobo', ['adobo']],
  ['lutong bahay na adobo', ['adobo']],
  ['piniritong manok', ['fried chicken']],
  ['inihaw na manok', ['grilled chicken']],
  ['puting kanin', ['white rice']],
  ['kanin', ['rice']],
  ['gatas', ['milk']],
  ['itlog', ['egg']],
  ['hipon', ['shrimp']],
]);

const TYPO_VARIANT_LIMIT = 8;

/**
 * Shared, deterministic food-query preparation for consultation and future
 * ingestion channels. It changes only the search query; canonical food data
 * and the existing catalog ranker remain untouched.
 */
@Injectable()
export class FoodQueryNormalizationService {
  normalize(value: string): string {
    return normalizeFoodSearchText(value);
  }

  removeConversationalWords(value: string): string {
    return this.normalize(value)
      .split(' ')
      .filter((token) => token.length > 1 && !QUERY_STOP_WORDS.has(token))
      .join(' ');
  }

  expandPhrase(value: string): readonly string[] {
    const normalized = this.normalize(value);
    const aliases = PHRASE_ALIASES.get(normalized) ?? [];
    return [normalized, ...aliases.filter((alias) => alias !== normalized)];
  }

  extractCandidatePhrases(question: string): readonly string[] {
    const normalized = this.removeConversationalWords(question);
    const tokens = normalized.split(' ').filter(Boolean);
    if (tokens.length === 0) return [];

    const phrases: string[] = [];
    const add = (value: string) => {
      for (const expanded of this.expandPhrase(value)) {
        const phrase = expanded.trim();
        if (phrase.length > 1 && !phrases.includes(phrase)) phrases.push(phrase);
      }
    };

    add(tokens.join(' '));
    for (let length = Math.min(tokens.length - 1, 3); length >= 1; length -= 1) {
      for (let start = 0; start + length <= tokens.length; start += 1) {
        add(tokens.slice(start, start + length).join(' '));
        if (phrases.length >= 8) return phrases.slice(0, 8);
      }
    }

    return phrases.slice(0, 8);
  }

  typoVariants(value: string): readonly string[] {
    const normalized = this.normalize(value);
    if (normalized.length < 4 || normalized.includes(' ')) return [];

    const variants: string[] = [];
    const add = (candidate: string) => {
      if (candidate.length > 2 && candidate !== normalized && !variants.includes(candidate)) {
        variants.push(candidate);
      }
    };

    // Common duplicated-letter typo: bananna -> banana.
    add(normalized.replace(/(.)\1+/g, '$1'));

    // One deletion and one adjacent transposition cover common keyboard and
    // omitted-letter errors without turning resolution into fuzzy guessing.
    for (let index = 0; index < normalized.length - 1 && variants.length < TYPO_VARIANT_LIMIT; index += 1) {
      add(`${normalized.slice(0, index)}${normalized[index + 1]}${normalized[index]}${normalized.slice(index + 2)}`);
    }
    for (let index = 0; index < normalized.length && variants.length < TYPO_VARIANT_LIMIT; index += 1) {
      add(`${normalized.slice(0, index)}${normalized.slice(index + 1)}`);
    }

    return variants.slice(0, TYPO_VARIANT_LIMIT);
  }
}
