import { Injectable } from '@nestjs/common';
import {
  BEVERAGE_CONTEXTS,
  BEVERAGE_DISPLAY_MODIFIERS,
  CATEGORY_PRODUCT_FORM_TYPES,
  FOOD_PREPARATIONS,
  FOOD_RIPENESS_DISPLAY_LABELS,
  FOOD_STATES,
  FOOD_IDENTITY_DESCRIPTORS,
  MEAT_ANIMALS,
  MEAT_CUTS,
  MEAT_PROCESSING_DESCRIPTORS,
  MEAT_QUALITY_DESCRIPTORS,
  MEAT_TRIM_AND_BONE_DESCRIPTORS,
  NATURALLY_RAW_PRODUCE_HEADS,
} from './food-presentation-vocabulary.js';
import type {
  FoodPresentationMetadata,
  FoodPresentationView,
} from '../types/food-presentation.type.js';

const ADMINISTRATIVE_PARENTHETICAL =
  /\s*\((?:[^)]*\bUSDA\b[^)]*|[^)]*Food Distribution Program[^)]*)\)/gi;
const NOISE_SEGMENTS = new Set([
  'broiler or fryer',
  'broiler or fryers',
  'broilers or fryers',
  'broilers or fryer',
  'with refuse',
  'without refuse',
]);
const CUT_SEGMENTS: ReadonlySet<string> = new Set(MEAT_CUTS);
const GENERIC_FISH = new Set(['fish', 'fishes']);
const GENERIC_MEATS: ReadonlySet<string> = new Set(MEAT_ANIMALS);
const MEAT_VARIANT_LABELS: Readonly<Record<string, string>> = {
  'bone in': 'Bone-in',
  boneless: 'Boneless',
  'external fat': 'External Fat',
  'flesh and skin': 'With Skin',
  'flesh only': 'Meat Only',
  'lean only': 'Lean Only',
  'meat and skin': 'With Skin',
  'meat only': 'Meat Only',
  'separable lean': 'Separable Lean',
  skinless: 'Skinless',
  'with skin': 'With Skin',
};
const PLURAL_EXCEPTIONS: Record<string, string> = {
  apples: 'Apple',
  bananas: 'Banana',
  eggs: 'Egg',
  potatoes: 'Potato',
  tomatoes: 'Tomato',
  berries: 'Berry',
};
const SPECIALTY_SEARCH_MARKERS = [
  'frozen',
  'pasteurized',
  'canned',
  'dried',
  'dehydrated',
  'powdered',
  'reconstituted',
  'glucose reduced',
  'concentrated',
  'hydrolyzed',
  'isolated',
  'textured',
  'instant',
  'processed',
  'imitation',
  'restaurant',
  'fast food',
  'specialty',
  'commercial',
];
const BIRD_EGG_SEARCH_MARKERS = ['duck', 'quail', 'goose', 'turkey'];
const COMMON_PREPARATION_SEARCH_BOOSTS: Readonly<Record<string, number>> = {
  'hard boiled': 3,
  fried: 2,
  scrambled: 1,
};
const EGG_PREPARATION_LABELS: Readonly<Record<string, string>> = {
  'hard-boiled': 'Hard-boiled',
  'soft-boiled': 'Soft-boiled',
  boiled: 'Boiled',
  fried: 'Fried',
  scrambled: 'Scrambled',
  poached: 'Poached',
  baked: 'Baked',
  omelet: 'Omelet',
  omelette: 'Omelet',
};
const EGG_SIZE_LABELS = new Set(['large', 'medium', 'small']);
const EGG_KIND_LABELS = new Set(['white', 'yolk']);
const FOOD_GROUP_PREFIXES = new Set([
  ...BEVERAGE_CONTEXTS,
  'cereal grains and pasta',
  'cereal',
  'cereals',
  'cereals ready to eat',
  'dairy and egg products',
  'finfish and shellfish products',
  'fruits and fruit juices',
  'fast food',
  'fast foods',
  'fats and oils',
  'lamb veal and game products',
  'legumes and legume products',
  'meals entrees and side dishes',
  'nut and seed products',
  'pork products',
  'poultry products',
  'restaurant',
  'snacks',
  'soups sauces and gravies',
  'soup',
  'soups',
  'spices and herbs',
  'sweets',
  'vegetables and vegetable products',
  'frozen meal',
  'frozen meals',
  'baby food',
  'baby foods',
  'babyfood',
]);
const BEVERAGE_CONTEXT_SET: ReadonlySet<string> = new Set(BEVERAGE_CONTEXTS);
const BEVERAGE_DISPLAY_MODIFIER_SET: ReadonlySet<string> = new Set(
  BEVERAGE_DISPLAY_MODIFIERS,
);
const FOOD_RIPENESS_LABELS: ReadonlyMap<string, string> = new Map(
  Object.entries(FOOD_RIPENESS_DISPLAY_LABELS),
);
const NATURALLY_RAW_PRODUCE_HEAD_SET: ReadonlySet<string> = new Set(
  NATURALLY_RAW_PRODUCE_HEADS.map(normalizeFoodSearchText),
);
const FOOD_IDENTITY_DESCRIPTOR_SET: ReadonlySet<string> = new Set(
  FOOD_IDENTITY_DESCRIPTORS.map(normalizeFoodSearchText),
);
const FOOD_CONTEXT_PREFIXES = new Set([
  'chinese',
  'italian',
  'latino',
  'mexican',
  'family style',
  'pizza chain',
]);
const FOOD_GROUP_DISPLAY_LABELS: Readonly<Record<string, string>> = {
  'alcoholic beverage': 'Alcoholic Beverage',
  'alcoholic beverages': 'Alcoholic Beverage',
  'fast food': 'Fast Food',
  'fast foods': 'Fast Food',
  'frozen meal': 'Frozen Meal',
  'frozen meals': 'Frozen Meal',
  'baby food': 'Baby Food',
  'baby foods': 'Baby Food',
};
const KNOWN_RESTAURANT_BRAND_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  'burger king': 'Burger King',
  'chick fil a': 'Chick-fil-A',
  'dairy queen': 'Dairy Queen',
  'domino s': "Domino's",
  'jack in the box': 'Jack in the Box',
  kfc: 'KFC',
  'mcdonald s': "McDonald's",
  popeyes: 'Popeyes',
  starbucks: 'Starbucks',
  'taco bell': 'Taco Bell',
  'the coca cola company': 'Coca-Cola',
  subway: 'Subway',
  'wendy s': "Wendy's",
};
const PRODUCT_BRAND_IDENTITY_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  'coca cola': 'Coca-Cola',
  doritos: 'Doritos',
  gatorade: 'Gatorade',
  'mountain dew': 'Mountain Dew',
  nutella: 'Nutella',
  oreo: 'Oreo',
  pepsi: 'Pepsi',
  pringles: 'Pringles',
  'red bull': 'Red Bull',
  spam: 'Spam',
  yakult: 'Yakult',
};
const KNOWN_BRAND_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  ...KNOWN_RESTAURANT_BRAND_DISPLAY_NAMES,
  ...PRODUCT_BRAND_IDENTITY_DISPLAY_NAMES,
  kfc: 'KFC',
  'the coca cola company': 'Coca-Cola',
};
const RESTAURANT_BRAND_PREFIXES = new Set(
  Object.keys(KNOWN_RESTAURANT_BRAND_DISPLAY_NAMES).concat('kfc'),
);
const PRESENTATION_VARIANT_LABELS: Readonly<Record<string, string>> = {
  'meat and skin and breading': 'With Breading',
  'meat and skin with breading': 'With Breading',
  'meat only skin and breading removed': 'Without Breading',
};
const INVERTED_COMPOUND_FOOD_TYPES: Readonly<Record<string, string>> = {
  bread: 'Bread',
  breads: 'Bread',
  burger: 'Burger',
  burgers: 'Burgers',
  cereal: 'Cereal',
  cereals: 'Cereal',
  cookie: 'Cookie',
  cookies: 'Cookie',
  noodle: 'Noodle',
  noodles: 'Noodles',
  pie: 'Pie',
  pies: 'Pie',
  pizza: 'Pizza',
  pizzas: 'Pizzas',
  roll: 'Roll',
  rolls: 'Roll',
  soup: 'Soup',
  soups: 'Soup',
  vinegar: 'Vinegar',
};
const COMPOUND_FOOD_SUFFIXES = new Set([
  'bagel',
  'bagels',
  'bar',
  'bars',
  'biscuit',
  'biscuits',
  'bread',
  'breads',
  'burrito',
  'burger',
  'bun',
  'buns',
  'cake',
  'cakes',
  'cereal',
  'cookie',
  'cookies',
  'cracker',
  'crackers',
  'croissant',
  'croissants',
  'donut',
  'donuts',
  'doughnut',
  'doughnuts',
  'flakes',
  'flatbread',
  'flatbreads',
  'juice',
  'muffin',
  'muffins',
  'noodle',
  'noodles',
  'pancake',
  'pancakes',
  'pastry',
  'pastries',
  'pie',
  'pies',
  'pizza',
  'pizzas',
  'roll',
  'rolls',
  'sandwich',
  'sandwiches',
  'salad',
  'salads',
  'sauce',
  'sauces',
  'soup',
  'soups',
  'squares',
  'square',
  'stew',
  'stews',
  'tart',
  'tarts',
  'taco',
  'tacos',
  'turnover',
  'turnovers',
  'waffle',
  'waffles',
  'wrap',
  'wraps',
  'cheese',
  'cheeses',
  'onion',
  'onions',
  'pepper',
  'peppers',
  'pudding',
  'puddings',
  'frosting',
  'frostings',
  'icing',
  'icings',
  'strudel',
  'strudels',
  'butter',
  'butters',
  'cream',
  'creams',
  'custard',
  'custards',
  'dip',
  'dips',
  'dressing',
  'dressings',
  'spread',
  'spreads',
  'salsa',
  'salsas',
  'jam',
  'jams',
  'jelly',
  'jellies',
  'marmalade',
  'marmalades',
  'pickle',
  'pickles',
  'relish',
  'relishes',
  'smoothie',
  'smoothies',
]);
const NON_PRODUCT_BRAND_PREFIXES = new Set(['quaker']);
const GENERIC_NON_BRAND_PREFIXES = new Set([
  'apple',
  'apples',
  'banana',
  'beef',
  'bean',
  'beans',
  'bread',
  'breads',
  'candy',
  'candies',
  'cheese',
  'chicken',
  'cereal',
  'cookie',
  'cookies',
  'cake',
  'cakes',
  'egg',
  'eggs',
  'fish',
  'fish oil',
  'frankfurter',
  'gravy',
  'ham',
  'juice',
  'lamb',
  'meat',
  'milk',
  'muffin',
  'muffins',
  'oil',
  'noodle',
  'noodles',
  'pasta',
  'pork',
  'potato',
  'potatoes',
  'rice',
  'roll',
  'rolls',
  'sauce',
  'salmon',
  'sausage',
  'seafood',
  'shrimp',
  'steak',
  'tea',
  'tomato',
  'tomatoes',
  'turkey',
  'tuna',
  'vinegar',
  'water',
  'wine',
  'yogurt',
  'pie',
  'pies',
  'pizza',
  'pizzas',
  'soup',
  'soups',
]);
const FOOD_DISH_FORMS = new Set([
  'burrito',
  'burger',
  'cheeseburger',
  'enchilada',
  'fajita',
  'hamburger',
  'hot dog',
  'nuggets',
  'pizza',
  'quesadilla',
  'sandwich',
  'soup',
  'taco',
  'tamale',
  'tender',
  'wrap',
]);
const COMPLETE_PRODUCT_FORM_TERMS = [
  'bar',
  'candy',
  'candy bar',
  'cake',
  'cookie',
  'cracker',
  'muffin',
  'pie',
  'roll',
  'sandwich',
  'soup',
  'cereal',
];

export function normalizeFoodSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeFoodSearchTokens(value: string): string[] {
  return normalizeFoodSearchText(value).split(' ').filter(Boolean);
}

/** Matches ordinary singular/plural forms without changing stored names. */
export function foodSearchTokensMatch(left: string, right: string): boolean {
  const normalizedLeft = normalizeFoodSearchText(left);
  const normalizedRight = normalizeFoodSearchText(right);
  return (
    normalizedLeft === normalizedRight ||
    singularize(normalizedLeft).toLowerCase() ===
      singularize(normalizedRight).toLowerCase()
  );
}

/**
 * Identifies a promoted variety title whose queried word is an identity
 * descriptor rather than a preparation/state. This lets broad searches such
 * as "rice" find "White Rice" without promoting every preparation title.
 */
export function isIdentityQualifiedDisplayName(
  displayName: string,
  query: string,
): boolean {
  const displayTokens = normalizeFoodSearchTokens(displayName);
  const queryTokens = normalizeFoodSearchTokens(query);
  if (queryTokens.length === 0 || displayTokens.length <= queryTokens.length)
    return false;

  const queryMatchesDisplay = queryTokens.every((queryToken) =>
    displayTokens.some((displayToken) =>
      foodSearchTokensMatch(queryToken, displayToken),
    ),
  );
  if (!queryMatchesDisplay) return false;

  return displayTokens.some(
    (displayToken) =>
      FOOD_IDENTITY_DESCRIPTOR_SET.has(displayToken) &&
      !queryTokens.some((queryToken) =>
        foodSearchTokensMatch(queryToken, displayToken),
      ),
  );
}

export function isSpecificFoodVariantQuery(value: string): boolean {
  const normalized = normalizeFoodSearchText(value);
  return [...SPECIALTY_SEARCH_MARKERS, ...BIRD_EGG_SEARCH_MARKERS].some(
    (marker) => normalized.includes(normalizeFoodSearchText(marker)),
  );
}

/**
 * Identifies a broad query that matches only the descriptor of a compound
 * food name, such as "oatmeal" in "Oatmeal Bread". Exact and full-phrase
 * searches are intentionally excluded.
 */
export function isModifierOnlyDisplayNameMatch(
  displayName: string,
  query: string,
): boolean {
  const displayTokens = normalizeFoodSearchText(displayName).split(' ');
  const queryTokens = normalizeFoodSearchText(query).split(' ');
  if (
    queryTokens.length === 0 ||
    displayTokens.length <= queryTokens.length ||
    displayTokens.slice(0, queryTokens.length).join(' ') !==
      queryTokens.join(' ')
  )
    return false;

  const compoundSuffix = displayTokens.at(-1) ?? '';
  if (!COMPOUND_FOOD_SUFFIXES.has(compoundSuffix)) return false;

  // Searching for the product form itself (for example, "bread" in
  // "Egg Bread") is a search for the head noun, not for a modifier.
  return !(queryTokens.length === 1 && queryTokens[0] === compoundSuffix);
}

/**
 * Recognizes natural compound names whose head noun is the queried concept,
 * such as "Scrambled Egg" for an "egg" search. These should rank ahead of
 * foods where the concept is only a modifier, such as "Egg Bread".
 */
export function isPrimaryConceptDisplayNameMatch(
  displayName: string,
  query: string,
): boolean {
  const displayTokens = normalizeFoodSearchText(displayName).split(' ');
  const queryTokens = normalizeFoodSearchText(query).split(' ');
  if (
    queryTokens.length === 0 ||
    displayTokens.length <= queryTokens.length ||
    displayTokens.slice(-queryTokens.length).join(' ') !== queryTokens.join(' ')
  )
    return false;

  return !(
    queryTokens.length === 1 &&
    COMPOUND_FOOD_SUFFIXES.has(queryTokens[0] ?? '')
  );
}

/**
 * Converts USDA's opaque "undetermined" measure label into a patient-facing
 * portion label. The stored Serving.name remains unchanged; this is only used
 * while building response/presentation sources.
 */
export function normalizeServingDisplayName(
  servingName: string,
  foodDisplayName?: string | null,
): string {
  const normalizedName = servingName.trim().replace(/\s+/g, ' ');
  if (!/\bundetermined\b/i.test(normalizedName)) return normalizedName;

  const quantity =
    normalizedName
      .split(/\bundetermined\b/i, 1)[0]
      ?.trim()
      .replace(/[,;:-]+$/, '')
      .trim() || '1';
  const label = foodDisplayName?.trim() || 'Portion';
  return `${quantity} ${label}`;
}

function titleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map(
      (word) =>
        `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`,
    )
    .join(' ');
}

function titleCaseProductConcept(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) =>
      /^[A-Z0-9&.-]{2,4}$/.test(word)
        ? word
        : `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`,
    )
    .join(' ');
}

function singularize(value: string): string {
  const normalized = value.trim();
  const exception = PLURAL_EXCEPTIONS[normalized.toLowerCase()];
  if (exception) return exception;
  if (/fries$/i.test(normalized)) return normalized;
  if (/ies$/i.test(normalized)) return `${normalized.slice(0, -3)}y`;
  if (/(?:ches|shes|xes|zes|ses)$/i.test(normalized))
    return normalized.slice(0, -2);
  if (/s$/i.test(normalized) && !/ss$/i.test(normalized))
    return normalized.slice(0, -1);
  return normalized;
}

function cleanSegment(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^\s*[,;:-]\s*|\s*[,;:-]\s*$/g, '')
    .trim();
}

function splitSegments(canonicalName: string): string[] {
  const segments = canonicalName
    .replace(ADMINISTRATIVE_PARENTHETICAL, '')
    .split(',')
    .map(cleanSegment)
    .filter(Boolean);
  const embeddedBrand = splitLeadingBrandSegment(segments[0] ?? '');
  return embeddedBrand
    ? [embeddedBrand.brand, embeddedBrand.product, ...segments.slice(1)]
    : segments;
}

function isNoiseSegment(segment: string): boolean {
  return (
    NOISE_SEGMENTS.has(segment.toLowerCase()) ||
    /^(?:includes|with added|without added)\b/i.test(segment)
  );
}

function normalizedSegment(segment: string): string {
  return normalizeFoodSearchText(segment);
}

function containsNormalizedTerm(text: string, term: string): boolean {
  const paddedText = ` ${text} `;
  return paddedText.includes(` ${normalizeFoodSearchText(term)} `);
}

function isFoodGroupPrefix(segment: string): boolean {
  return FOOD_GROUP_PREFIXES.has(normalizedSegment(segment));
}

function isBeverageContextPrefix(segment: string): boolean {
  return BEVERAGE_CONTEXT_SET.has(normalizedSegment(segment));
}

function isGenericBeverageContext(segment: string): boolean {
  const normalized = normalizedSegment(segment);
  return normalized === 'beverage' || normalized === 'beverages';
}

function brandDisplayName(segment: string): string | null {
  return KNOWN_BRAND_DISPLAY_NAMES[normalizedSegment(segment)] ?? null;
}

function isProductBrandIdentity(segment: string): boolean {
  return normalizedSegment(segment) in PRODUCT_BRAND_IDENTITY_DISPLAY_NAMES;
}

function isRestaurantBrandPrefix(segment: string): boolean {
  return RESTAURANT_BRAND_PREFIXES.has(normalizedSegment(segment));
}

function isNonProductBrandPrefix(segment: string): boolean {
  return NON_PRODUCT_BRAND_PREFIXES.has(normalizedSegment(segment));
}

/**
 * Returns true only when the canonical segment carries an explicit brand
 * signal. A title-cased word by itself is intentionally not enough: USDA
 * commonly title-cases ordinary food nouns such as "Carrots", "Broccoli",
 * and "Bananas".
 */
function hasExplicitBrandSignal(segment: string): boolean {
  if (
    isRestaurantBrandPrefix(segment) ||
    isProductBrandIdentity(segment) ||
    isNonProductBrandPrefix(segment) ||
    brandDisplayName(segment) ||
    /[’']s$/i.test(segment.trim())
  )
    return true;

  const letters = segment.match(/[A-Za-z]/g) ?? [];
  return (
    letters.length >= 2 &&
    letters.join('') === letters.join('').toUpperCase()
  );
}

function isLikelyBrandSegment(segment: string): boolean {
  const normalized = normalizedSegment(segment);
  if (!normalized || GENERIC_NON_BRAND_PREFIXES.has(normalized)) return false;
  return hasExplicitBrandSignal(segment);
}

function splitLeadingBrandSegment(
  segment: string,
): { brand: string; product: string } | null {
  const words = segment.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;

  let brandWordCount = 0;
  for (const word of words) {
    const letters = word.match(/[A-Za-z]/g) ?? [];
    const isUppercaseBrandWord =
      letters.length >= 2 &&
      letters.join('') === letters.join('').toUpperCase();
    if (!isLikelyBrandSegment(word) && !isUppercaseBrandWord) break;
    brandWordCount += 1;
  }

  if (brandWordCount === 0 || brandWordCount >= words.length) return null;
  return {
    brand: words.slice(0, brandWordCount).join(' '),
    product: words.slice(brandWordCount).join(' '),
  };
}

function isPotentialLeadingRetailBrand(
  segment: string,
  segmentCount: number,
  nextSegment?: string,
  hasTrailingPreparationOrState = false,
): boolean {
  if (hasExplicitBrandSignal(segment)) return true;
  // A plain food noun followed by a USDA preparation/state descriptor is a
  // food concept, not a manufacturer. This prevents names such as
  // "Carrots, raw" from becoming "Raw" with "Carrots" as its variant.
  if (hasTrailingPreparationOrState) return false;
  const value = segment.trim();
  const next = normalizedSegment(nextSegment ?? '');
  if (next && COMPOUND_FOOD_SUFFIXES.has(next)) return false;
  return (
    segmentCount >= 2 &&
    /^[A-Z][a-z]+(?:[-'][A-Za-z]+)?$/.test(value) &&
    !COMPOUND_FOOD_SUFFIXES.has(normalizedSegment(value)) &&
    !GENERIC_NON_BRAND_PREFIXES.has(normalizedSegment(value))
  );
}

function isImplicitRetailBrandCandidate(segment: string): boolean {
  const value = segment.trim();
  const normalized = normalizedSegment(value);
  return (
    normalized.length > 0 &&
    !hasExplicitBrandSignal(value) &&
    !COMPOUND_FOOD_SUFFIXES.has(normalized) &&
    !GENERIC_NON_BRAND_PREFIXES.has(normalized) &&
    /^[A-Z][a-z]+(?:[-'][A-Za-z]+)?$/.test(value)
  );
}

function stripLeadingBrandFromProductSegment(
  segment: string,
  brand: string,
): string {
  const brandWords = normalizedSegment(brand).split(' ').filter(Boolean);
  if (brandWords.length === 0) return segment;

  let remaining = segment.trim();
  for (const word of brandWords) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = remaining.match(
      new RegExp(`^${escaped}(?:['’]s)?(?:[\\s/,-]+|$)`, 'i'),
    );
    if (!match) return segment;
    remaining = remaining.slice(match[0].length).trim();
  }
  return remaining || segment;
}

function isPreparationOrStateDescriptor(segment: string): boolean {
  const normalized = normalizedSegment(segment);
  return [...FOOD_PREPARATIONS, ...FOOD_STATES].some((term) =>
    containsNormalizedTerm(normalized, term),
  );
}

function isExactFoodStateDescriptor(segment: string): boolean {
  const normalized = normalizedSegment(segment);
  return FOOD_STATES.some((term) => normalizedSegment(term) === normalized);
}

function isExactPreparationOrStateDescriptor(segment: string): boolean {
  const normalized = normalizedSegment(segment);
  return [...FOOD_PREPARATIONS, ...FOOD_STATES].some(
    (term) => normalizedSegment(term) === normalized,
  );
}

function isCompleteProductDescriptor(
  descriptor: string,
  categoryForm: { singular: string; plural: string },
): boolean {
  const normalized = normalizedSegment(descriptor);
  const categoryForms = [categoryForm.singular, categoryForm.plural].map(
    normalizeFoodSearchText,
  );
  return (
    categoryForms.some((form) => normalized.endsWith(` ${form}`) || normalized === form) ||
    COMPLETE_PRODUCT_FORM_TERMS.some((term) =>
      containsNormalizedTerm(normalized, term),
    )
  );
}

function deriveCategoryProductFormName(
  segments: readonly string[],
  categoryIndex = 0,
): { displayName: string; used: Set<number> } | null {
  const category = segments[categoryIndex];
  if (!category) return null;

  const categoryForm = CATEGORY_PRODUCT_FORM_TYPES[normalizedSegment(category)];
  if (!categoryForm) return null;

  const initialDescriptorIndex = segments.findIndex(
    (segment, index) =>
      index > categoryIndex &&
      !isNoiseSegment(segment) &&
      !isFoodGroupPrefix(segment) &&
      !isNonProductBrandPrefix(segment),
  );
  if (initialDescriptorIndex < 0) return null;

  const descriptorIndex =
    isLikelyBrandSegment(segments[initialDescriptorIndex] ?? '')
      ? segments.findIndex(
          (segment, index) =>
            index > initialDescriptorIndex &&
            !isNoiseSegment(segment) &&
            !isFoodGroupPrefix(segment) &&
            !isNonProductBrandPrefix(segment),
        )
      : initialDescriptorIndex;
  if (descriptorIndex < 0) return null;

  const descriptor = cleanSegment(segments[descriptorIndex]!);
  if (!descriptor) return null;

  // A state such as raw, cooked, or frozen describes the category item; it
  // is not the food concept itself. Keep the existing product-form behavior
  // for meaningful forms such as "mashed potatoes", but let plain states
  // flow through the ordinary-food grammar and become variants.
  if (isExactFoodStateDescriptor(descriptor)) return null;

  const descriptorName = titleCase(descriptor);
  const displayName = isCompleteProductDescriptor(descriptor, categoryForm)
    ? descriptorName
    : `${descriptorName} ${
        isPreparationOrStateDescriptor(descriptor)
          ? categoryForm.plural
          : categoryForm.singular
      }`;

  return {
    displayName,
    used: new Set([categoryIndex, descriptorIndex]),
  };
}

function deriveContextualDishName(
  segments: readonly string[],
): { displayName: string; used: Set<number> } | null {
  if (!isFoodGroupPrefix(segments[0] ?? '')) return null;

  const productIndex = segments.findIndex(
    (segment, index) =>
      index > 0 &&
      !isNoiseSegment(segment) &&
      !isFoodGroupPrefix(segment) &&
      !FOOD_CONTEXT_PREFIXES.has(normalizedSegment(segment)) &&
      !isNonProductBrandPrefix(segment),
  );
  if (
    productIndex < 0 ||
    !FOOD_DISH_FORMS.has(normalizedSegment(segments[productIndex]!))
  )
    return null;

  const proteinIndex = segments.findIndex(
    (segment, index) =>
      index > productIndex && GENERIC_MEATS.has(normalizedSegment(segment)),
  );
  if (proteinIndex < 0) return null;

  return {
    displayName: `${titleCase(singularize(segments[proteinIndex]!))} ${titleCase(
      segments[productIndex]!,
    )}`,
    used: new Set([productIndex, proteinIndex]),
  };
}

function isStandaloneEggSegment(segment: string): boolean {
  const tokens = normalizedSegment(segment).split(' ');
  return (
    (tokens.includes('egg') || tokens.includes('eggs')) &&
    tokens.every(
      (token) =>
        token === 'egg' ||
        token === 'eggs' ||
        EGG_KIND_LABELS.has(token) ||
        token === 'whole',
    )
  );
}

function eggKindIndex(segments: readonly string[]): number {
  return segments.findIndex((segment) => {
    const normalized = normalizedSegment(segment);
    return (
      EGG_KIND_LABELS.has(normalized) ||
      normalized === 'egg white' ||
      normalized === 'egg yolk'
    );
  });
}

function eggPreparationLabel(segment: string): string | null {
  const normalized = normalizedSegment(segment);
  return (
    Object.entries(EGG_PREPARATION_LABELS).find(
      ([key]) => normalizedSegment(key) === normalized,
    )?.[1] ?? null
  );
}

function deriveEggNameAndUsedSegments(
  segments: readonly string[],
  eggIndex: number,
): { displayName: string; used: Set<number> } {
  const used = new Set<number>([eggIndex]);
  const kindIndex = eggKindIndex(segments);
  const preparationIndex = segments.findIndex(
    (segment) => eggPreparationLabel(segment) != null,
  );
  const sizeIndex = segments.findIndex((segment) =>
    EGG_SIZE_LABELS.has(normalizedSegment(segment)),
  );

  if (kindIndex >= 0 && kindIndex !== eggIndex) used.add(kindIndex);
  if (preparationIndex >= 0) used.add(preparationIndex);

  segments.forEach((segment, index) => {
    const normalized = normalizedSegment(segment);
    if (normalized === 'whole' || normalized === 'cooked') used.add(index);
  });

  if (kindIndex >= 0) {
    const kind = normalizedSegment(segments[kindIndex]!).includes('yolk')
      ? 'Yolk'
      : 'White';
    return {
      displayName: `Egg ${kind}`,
      used,
    };
  }

  if (preparationIndex >= 0) {
    return {
      displayName: `${eggPreparationLabel(segments[preparationIndex]!)} Egg`,
      used,
    };
  }

  if (sizeIndex >= 0) {
    used.add(sizeIndex);
    return {
      displayName: `${titleCase(normalizedSegment(segments[sizeIndex]!))} Egg`,
      used,
    };
  }

  return { displayName: 'Egg', used };
}

function isMeatAnimalToken(token: string): boolean {
  return GENERIC_MEATS.has(token);
}

function meatNameWordsToDisplay(value: string): string {
  return value
    .replace(/[()]/g, ' ')
    .replace(/\brib\s+eye\b/gi, 'ribeye')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => singularize(word))
    .join(' ');
}

function removeMeatVariantWords(value: string): string {
  let result = normalizedSegment(value);
  const removable = [
    ...MEAT_TRIM_AND_BONE_DESCRIPTORS,
    ...MEAT_QUALITY_DESCRIPTORS,
    ...MEAT_PROCESSING_DESCRIPTORS,
    ...FOOD_PREPARATIONS,
    ...FOOD_STATES,
  ].sort((left, right) => right.length - left.length);

  for (const word of removable) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'g'), ' ');
  }
  return result.replace(/\s+/g, ' ').trim();
}

function isMeatCutSegment(segment: string): boolean {
  const normalized = normalizedSegment(segment);
  const words = normalized.split(' ');
  return (
    CUT_SEGMENTS.has(normalized) ||
    words.some((word) => CUT_SEGMENTS.has(singularize(word).toLowerCase()))
  );
}

function isMeatFormWord(value: string): boolean {
  return new Set(['chop', 'cutlet', 'filet', 'fillet', 'roast', 'steak']).has(
    singularize(normalizedSegment(value)).toLowerCase(),
  );
}

function deriveMeatName(
  segments: readonly string[],
): { displayName: string; used: Set<number> } | null {
  const animalIndex = segments.findIndex((segment) => {
    const words = normalizedSegment(segment).split(' ');
    return words.length > 0 && isMeatAnimalToken(words[0]!);
  });
  if (animalIndex < 0) return null;

  const cutIndices = segments.reduce<number[]>((indices, segment, index) => {
    if (index >= animalIndex && isMeatCutSegment(segment)) indices.push(index);
    return indices;
  }, []);
  if (cutIndices.length === 0) return null;

  const candidates = cutIndices
    .map((index) => ({
      index,
      value: removeMeatVariantWords(segments[index]!),
    }))
    .filter(({ value }) => value.length > 0)
    .sort(
      (left, right) =>
        right.value.split(' ').length - left.value.split(' ').length ||
        left.index - right.index,
    );
  const primary = candidates[0];
  if (!primary) return null;

  const used = new Set<number>([animalIndex, ...cutIndices]);
  let cutPhrase = primary.value;
  for (const candidate of candidates) {
    if (
      candidate.index !== primary.index &&
      isMeatFormWord(candidate.value) &&
      !cutPhrase.split(' ').includes(candidate.value)
    ) {
      cutPhrase = `${cutPhrase} ${candidate.value}`;
    }
  }

  const species = meatNameWordsToDisplay(segments[animalIndex]!);
  const cut = meatNameWordsToDisplay(cutPhrase);
  if (!species || !cut) return null;

  const normalizedCut = normalizedSegment(cut);
  const speciesOptional =
    /^(?:top|bottom) round(?: roast)?$|^ribeye(?: steak)?$/i.test(normalizedCut);
  const displayName =
    normalizedCut === 'ground'
      ? `Ground ${titleCase(species)}`
      : speciesOptional
        ? titleCase(cut)
        : `${titleCase(species)} ${titleCase(cut)}`;
  return {
    displayName,
    used,
  };
}

function deriveCategoryLeadingName(
  segments: readonly string[],
): { displayName: string; used: Set<number> } | null {
  if (!isFoodGroupPrefix(segments[0] ?? '')) return null;

  const contextualDishName = deriveContextualDishName(segments);
  if (contextualDishName) return contextualDishName;

  const nestedCategoryProductFormName = deriveCategoryProductFormName(segments, 1);
  if (nestedCategoryProductFormName) return nestedCategoryProductFormName;

  const meatName = deriveMeatName(segments);
  if (meatName && [...meatName.used].some((index) => index > 0)) {
    return meatName;
  }

  const foodIndex = segments.findIndex(
    (segment, index) =>
      index > 0 &&
      !isNoiseSegment(segment) &&
      !isFoodGroupPrefix(segment) &&
      !FOOD_CONTEXT_PREFIXES.has(normalizedSegment(segment)) &&
      !isNonProductBrandPrefix(segment),
  );
  if (foodIndex < 0) return { displayName: 'Food', used: new Set() };

  const used = new Set<number>([foodIndex]);
  const candidate = segments[foodIndex]!;
  const candidateTokens = normalizedSegment(candidate).split(' ');
  const cutIndex = segments.findIndex(
    (segment, index) =>
      index > foodIndex && CUT_SEGMENTS.has(normalizedSegment(segment)),
  );
  const hasMeat =
    GENERIC_MEATS.has(candidateTokens[0] ?? '') ||
    candidateTokens.some((token) => GENERIC_MEATS.has(token));

  if (hasMeat && cutIndex > foodIndex) {
    used.add(cutIndex);
    return {
      displayName: `${titleCase(candidate)} ${titleCase(segments[cutIndex]!)}`,
      used,
    };
  }

  return {
    displayName: brandDisplayName(candidate) ?? titleCase(candidate),
    used,
  };
}

function deriveInvertedCompoundName(
  segments: readonly string[],
  typeIndex: number,
): { displayName: string; used: Set<number> } | null {
  const normalizedFoodType = normalizedSegment(segments[typeIndex] ?? '');
  const descriptorIndex = typeIndex + 1;
  const descriptor = segments[descriptorIndex];
  const normalizedDescriptor = normalizedSegment(descriptor ?? '');
  const explicitFoodType = INVERTED_COMPOUND_FOOD_TYPES[normalizedFoodType];
  if (!explicitFoodType && INVERTED_COMPOUND_FOOD_TYPES[normalizedDescriptor]) {
    return null;
  }
  const foodType =
    explicitFoodType ??
    (COMPOUND_FOOD_SUFFIXES.has(normalizedFoodType)
      ? titleCase(singularize(segments[typeIndex]!))
      : undefined);
  if (
    !foodType ||
    !descriptor ||
    isNoiseSegment(descriptor) ||
    isNonProductBrandPrefix(descriptor)
  )
    return null;

  return {
    displayName: `${titleCase(singularize(descriptor))} ${foodType}`,
    used: new Set([typeIndex, descriptorIndex]),
  };
}

/**
 * Promotes a complete food concept when USDA places the ingredient or food
 * concept before a product form, for example "Egg, noodles" or
 * "Cheese, pizza". Descriptive preparation and enrichment segments remain
 * available for the variant label.
 */
function deriveTrailingCompoundName(
  segments: readonly string[],
): { displayName: string; used: Set<number> } | null {
  const headIndex = segments.findIndex(
    (segment, index) =>
      !isNoiseSegment(segment) &&
      !isExactFoodStateDescriptor(segment) &&
      !isFoodGroupPrefix(segment) &&
      !FOOD_CONTEXT_PREFIXES.has(normalizedSegment(segment)) &&
      !isLikelyBrandSegment(segment) &&
      index >= 0,
  );
  const head = headIndex < 0 ? undefined : segments[headIndex];
  if (
    !head ||
    isLikelyBrandSegment(head)
  )
    return null;

  const formIndex = segments.findIndex(
    (segment, index) =>
      index > headIndex &&
      COMPOUND_FOOD_SUFFIXES.has(normalizedSegment(segment)),
  );
  if (formIndex < 0) return null;

  const foodName = titleCase(singularize(head));
  const productForm = titleCase(segments[formIndex]!);
  if (!foodName || !productForm) return null;

  return {
    displayName: `${foodName} ${productForm}`,
    used: new Set([headIndex, formIndex]),
  };
}

/**
 * Keeps a leading preparation/state descriptor out of the primary concept.
 * For example, "Raw, apple" becomes "Apple" with "Raw" as a variant.
 */
function deriveStatePrefixedName(
  segments: readonly string[],
): { displayName: string; used: Set<number> } | null {
  if (!isExactPreparationOrStateDescriptor(segments[0] ?? '')) return null;

  const firstFoodIndex = segments.findIndex(
    (segment, index) =>
      index > 0 &&
      !isNoiseSegment(segment) &&
      !isPreparationOrStateDescriptor(segment) &&
      !isFoodGroupPrefix(segment) &&
      !FOOD_CONTEXT_PREFIXES.has(normalizedSegment(segment)) &&
      !isLikelyBrandSegment(segment),
  );
  if (firstFoodIndex < 1) return null;

  const meatName = deriveMeatName(segments);
  if (meatName && [...meatName.used].some((index) => index >= firstFoodIndex)) {
    return meatName;
  }

  const food = segments[firstFoodIndex];
  if (!food) return null;
  return {
    displayName: titleCase(singularize(food)),
    used: new Set([firstFoodIndex]),
  };
}

function deriveBeverageName(
  segments: readonly string[],
): { displayName: string; used: Set<number> } | null {
  if (!isBeverageContextPrefix(segments[0] ?? '')) return null;

  const beverageIndex = segments.findIndex(
    (segment, index) =>
      index > 0 &&
      !isNoiseSegment(segment) &&
      !isFoodGroupPrefix(segment) &&
      !FOOD_CONTEXT_PREFIXES.has(normalizedSegment(segment)) &&
      !isNonProductBrandPrefix(segment) &&
      !isExactPreparationOrStateDescriptor(segment),
  );
  if (beverageIndex < 0) return null;

  const beverage = segments[beverageIndex];
  if (!beverage) return null;

  const modifierIndex = beverageIndex + 1;
  const modifier = segments[modifierIndex];
  const normalizedModifier = normalizedSegment(modifier ?? '');
  const promotesModifier =
    modifier != null && BEVERAGE_DISPLAY_MODIFIER_SET.has(normalizedModifier);
  const used = new Set<number>([beverageIndex]);
  if (isGenericBeverageContext(segments[0] ?? '')) used.add(0);
  if (promotesModifier) used.add(modifierIndex);

  return {
    displayName: `${promotesModifier ? `${titleCase(modifier!)} ` : ''}${titleCase(
      singularize(beverage),
    )}`,
    used,
  };
}

function deriveBrandLeadingName(
  segments: readonly string[],
): { displayName: string; used: Set<number> } | null {
  const hasFoodGroupPrefix = isFoodGroupPrefix(segments[0] ?? '');
  const hasTrailingPreparationOrState = segments
    .slice(1)
    .some(isExactPreparationOrStateDescriptor);
  const brandIndex = hasFoodGroupPrefix
    ? segments.findIndex(
        (segment, index) => index > 0 && isLikelyBrandSegment(segment),
      )
    : isPotentialLeadingRetailBrand(
        segments[0] ?? '',
        segments.length,
        segments[1],
        hasTrailingPreparationOrState,
      )
      ? 0
      : -1;
  if (brandIndex < 0) return null;

  if (isProductBrandIdentity(segments[brandIndex]!)) {
    return {
      displayName:
        brandDisplayName(segments[brandIndex]!) ??
        titleCase(segments[brandIndex]!),
      used: new Set([brandIndex]),
    };
  }

  const productIndex = segments.findIndex(
    (segment, index) =>
      index > brandIndex &&
      !isNoiseSegment(segment) &&
      !FOOD_CONTEXT_PREFIXES.has(normalizedSegment(segment)) &&
      !isNonProductBrandPrefix(segment),
  );
  if (productIndex < 0) return null;

  const productSegments = segments.slice(productIndex);
  const strippedProductStart = stripLeadingBrandFromProductSegment(
    productSegments[0]!,
    segments[brandIndex]!,
  );
  if (strippedProductStart !== productSegments[0]) {
    productSegments[0] = strippedProductStart;
  }
  const product = deriveNameAndUsedSegments(productSegments);
  // The brand is intentionally left unused so it becomes part of the
  // variantLabel; only the resolved food concept is promoted to the title.
  const used = new Set<number>();
  for (const index of product.used) used.add(productIndex + index);

  return {
    displayName:
      product.used.size === 1 && product.used.has(0)
        ? titleCaseProductConcept(singularize(productSegments[0]!))
        : product.displayName,
    used,
  };
}

function deriveNameAndUsedSegments(segments: readonly string[]): {
  displayName: string;
  used: Set<number>;
} {
  const brandLeadingName = deriveBrandLeadingName(segments);
  if (brandLeadingName) return brandLeadingName;

  const invertedCompoundName = deriveInvertedCompoundName(segments, 0);
  if (invertedCompoundName) return invertedCompoundName;

  const trailingCompoundName = deriveTrailingCompoundName(segments);
  if (trailingCompoundName) return trailingCompoundName;

  const eggIndex = segments.findIndex(isStandaloneEggSegment);
  if (eggIndex >= 0) return deriveEggNameAndUsedSegments(segments, eggIndex);

  const beverageName = deriveBeverageName(segments);
  if (beverageName) return beverageName;

  const categoryProductFormName = deriveCategoryProductFormName(segments);
  if (categoryProductFormName) return categoryProductFormName;

  const categoryLeadingName = deriveCategoryLeadingName(segments);
  if (categoryLeadingName) return categoryLeadingName;

  const statePrefixedName = deriveStatePrefixedName(segments);
  if (statePrefixedName) return statePrefixedName;

  const identityQualifiedName = deriveIdentityQualifiedName(segments);
  if (identityQualifiedName) return identityQualifiedName;

  const ripenessName = deriveRipenessName(segments);
  if (ripenessName) return ripenessName;

  // USDA frequently emits ordinary food nouns as title-cased first
  // segments. When one is followed by a known preparation/state descriptor,
  // promote that noun and leave the descriptor for the variant label. This
  // is deliberately vocabulary-driven and does not enumerate foods.
  const leadingFoodWithDescriptor = deriveLeadingFoodWithDescriptor(segments);
  if (leadingFoodWithDescriptor) return leadingFoodWithDescriptor;

  const first = segments[0] ?? '';
  const firstLower = first.toLowerCase();
  const knownBrandName = brandDisplayName(first);
  const used = new Set<number>([0]);

  if (knownBrandName) return { displayName: knownBrandName, used };

  if (GENERIC_FISH.has(firstLower)) {
    const fishIndex = segments.findIndex(
      (segment, index) => index > 0 && !isNoiseSegment(segment),
    );
    if (fishIndex > 0) {
      used.add(fishIndex);
      return {
        displayName: titleCase(singularize(segments[fishIndex]!)),
        used,
      };
    }
  }

  if (GENERIC_MEATS.has(firstLower)) {
    const meatName = deriveMeatName(segments);
    if (meatName) return meatName;
  }

  return { displayName: titleCase(singularize(first)), used };
}

function deriveLeadingFoodWithDescriptor(
  segments: readonly string[],
): { displayName: string; used: Set<number> } | null {
  const first = segments[0];
  if (
    !first ||
    !isImplicitRetailBrandCandidate(first) ||
    !segments.slice(1).some(isExactPreparationOrStateDescriptor)
  )
    return null;

  return {
    displayName: titleCase(first),
    used: new Set([0]),
  };
}

/**
 * Promotes a meaningful variety descriptor into the title when USDA places
 * it after a broad food head, for example "Rice, white, cooked". The food
 * head is deliberately vocabulary-driven and the descriptor list contains
 * only identity terms; preparation, state, quality, and processing terms
 * remain variants.
 */
function deriveIdentityQualifiedName(
  segments: readonly string[],
): { displayName: string; used: Set<number> } | null {
  const head = segments[0];
  const normalizedHead = normalizedSegment(head ?? '');
  if (!head || !GENERIC_NON_BRAND_PREFIXES.has(normalizedHead)) return null;

  const descriptorIndex = segments.findIndex(
    (segment, index) =>
      index > 0 && FOOD_IDENTITY_DESCRIPTOR_SET.has(normalizedSegment(segment)),
  );
  if (descriptorIndex < 0) return null;

  const descriptor = segments[descriptorIndex];
  if (!descriptor || isExactPreparationOrStateDescriptor(descriptor)) {
    return null;
  }

  return {
    displayName: `${titleCase(descriptor)} ${titleCase(singularize(head))}`,
    used: new Set([0, descriptorIndex]),
  };
}

/**
 * Produces natural names for simple produce records whose USDA descriptors
 * communicate ripeness and raw state, for example "Bananas, ripe and
 * slightly ripe, raw" -> "Ripe Banana". The rule is vocabulary-driven and
 * deliberately excludes compound, prepared, and branded records.
 */
function deriveRipenessName(
  segments: readonly string[],
): { displayName: string; used: Set<number> } | null {
  const head = segments[0];
  if (!head || isFoodGroupPrefix(head) || isLikelyBrandSegment(head)) return null;

  const normalizedHead = normalizedSegment(head);
  const singularHead = normalizedSegment(singularize(head));
  if (
    !NATURALLY_RAW_PRODUCE_HEAD_SET.has(normalizedHead) &&
    !NATURALLY_RAW_PRODUCE_HEAD_SET.has(singularHead)
  )
    return null;

  let ripenessLabel: string | undefined;
  let hasRawState = false;
  for (const segment of segments.slice(1)) {
    const normalized = normalizedSegment(segment);
    const label = FOOD_RIPENESS_LABELS.get(normalized);
    if (label) {
      if (ripenessLabel != null && ripenessLabel !== label) return null;
      ripenessLabel = label;
      continue;
    }
    if (normalized === 'raw') {
      hasRawState = true;
      continue;
    }
    return null;
  }

  if (!hasRawState) return null;

  const foodName = titleCaseProductConcept(singularize(head));
  return {
    displayName: ripenessLabel == null ? foodName : `${ripenessLabel} ${foodName}`,
    used: new Set(segments.map((_, index) => index)),
  };
}

export function deriveFoodPresentation(
  canonicalName: string,
): Pick<FoodPresentationView, 'derivedDisplayName' | 'derivedVariantLabel'> {
  const segments = splitSegments(canonicalName);
  if (segments.length === 0)
    return {
      derivedDisplayName: canonicalName.trim(),
      derivedVariantLabel: null,
    };

  const { displayName, used } = deriveNameAndUsedSegments(segments);
  const variantSegments = segments.filter(
    (segment, index) =>
      !used.has(index) &&
      !isNoiseSegment(segment) &&
      !isGenericBeverageContext(segment),
  );
  const derivedVariantLabel =
    variantSegments.length > 0
      ? variantSegments
          .map(
            (segment) =>
              FOOD_GROUP_DISPLAY_LABELS[normalizedSegment(segment)] ??
              PRESENTATION_VARIANT_LABELS[normalizedSegment(segment)] ??
              MEAT_VARIANT_LABELS[normalizedSegment(segment)] ??
              brandDisplayName(segment) ??
              titleCase(segment),
          )
          .join(' \u00b7 ')
      : null;
  return { derivedDisplayName: displayName, derivedVariantLabel };
}

function deriveSearchPriority(canonicalName: string): number {
  const normalized = normalizeFoodSearchText(canonicalName);
  const tokens = normalized.split(' ');
  const specialtyPenalty = SPECIALTY_SEARCH_MARKERS.filter((marker) =>
    normalized.includes(normalizeFoodSearchText(marker)),
  ).length;
  const ordinaryVariantBoost = ['raw', 'fresh'].filter((marker) =>
    tokens.includes(marker),
  ).length;
  const birdEggPenalty =
    (tokens.includes('egg') || tokens.includes('eggs')) &&
    BIRD_EGG_SEARCH_MARKERS.some((marker) => tokens.includes(marker))
      ? 6
      : 0;
  const preparationBoost =
    Object.entries(COMMON_PREPARATION_SEARCH_BOOSTS).find(([marker]) =>
      normalized.includes(marker),
    )?.[1] ?? 0;
  const eggKindBoost = tokens.includes('white')
    ? 2
    : tokens.includes('yolk')
      ? 1
      : 0;
  return (
    ordinaryVariantBoost +
    preparationBoost +
    eggKindBoost -
    specialtyPenalty * 8 -
    birdEggPenalty
  );
}

export function resolveFoodPresentation(
  canonicalName: string,
  metadata?: FoodPresentationMetadata | null,
): FoodPresentationView {
  const derived = deriveFoodPresentation(canonicalName);
  const aliases = (metadata?.aliases ?? [])
    .map(({ alias }) => alias.trim())
    .filter(Boolean);
  return {
    ...derived,
    displayName:
      metadata?.displayNameOverride?.trim() || derived.derivedDisplayName,
    variantLabel:
      metadata?.variantLabelOverride?.trim() || derived.derivedVariantLabel,
    // Curated priority adjusts the deterministic baseline rather than
    // disabling the ordinary-vs-specialty distinction for persisted rows.
    searchPriority:
      (metadata?.searchPriority ?? 0) + deriveSearchPriority(canonicalName),
    aliases,
  };
}

@Injectable()
export class FoodPresentationService {
  resolve(
    canonicalName: string,
    metadata?: FoodPresentationMetadata | null,
  ): FoodPresentationView {
    return resolveFoodPresentation(canonicalName, metadata);
  }

  normalizeSearchText(value: string): string {
    return normalizeFoodSearchText(value);
  }
}
