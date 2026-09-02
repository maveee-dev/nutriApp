import type { Recipe } from './types/recipe.types';

/**
 * Matches all meaningful query words against the current recipe name. A
 * small singular/plural tolerance keeps searches such as "green beans"
 * useful for a recipe named "Green Bean Salad" without introducing a second
 * ranking system.
 */
export function recipeMatchesQuery(recipe: Recipe, query: string): boolean {
  const name = recipe.versions[0]?.name ?? '';
  const queryTokens = tokenize(query);
  const nameTokens = new Set(tokenize(name));
  return queryTokens.length > 0 && queryTokens.every((token) => {
    const singular = singularize(token);
    return nameTokens.has(token) || nameTokens.has(singular) || singular === token && nameTokens.has(`${token}s`);
  });
}

function tokenize(value: string): string[] {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

function singularize(token: string): string {
  if (token.endsWith('ies') && token.length > 3) return `${token.slice(0, -3)}y`;
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 2) return token.slice(0, -1);
  return token;
}
