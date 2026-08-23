/** Shared vocabulary for deterministic food-presentation grammar and audits. */
export const MEAT_ANIMALS = [
  'beef',
  'bison',
  'chicken',
  'duck',
  'goat',
  'goose',
  'lamb',
  'pork',
  'rabbit',
  'turkey',
  'veal',
  'venison',
] as const;

export const MEAT_CUTS = [
  'breast',
  'brisket',
  'chop',
  'chuck',
  'cutlet',
  'drumstick',
  'flank',
  'filet',
  'fillet',
  'ground',
  'leg',
  'loin',
  'rib',
  'ribeye',
  'rib eye',
  'round',
  'roast',
  'rump',
  'shank',
  'shoulder',
  'sirloin',
  'steak',
  'tenderloin',
  'thigh',
  'wing',
] as const;

export const FOOD_PREPARATIONS = [
  'baked',
  'boiled',
  'braised',
  'broiled',
  'cooked',
  'fried',
  'grilled',
  'poached',
  'roasted',
  'sauteed',
  'mashed',
  'scrambled',
  'steamed',
  'stewed',
  'stir fried',
] as const;

export const FOOD_STATES = [
  'canned',
  'cooked',
  'dehydrated',
  'dried',
  'fresh',
  'frozen',
  'pasteurized',
  'processed',
  'raw',
  'ready to eat',
  'reconstituted',
  'smoked',
  'unsalted',
] as const;

/** Generic beverage contexts and descriptors used by the presentation grammar. */
export const BEVERAGE_CONTEXTS = [
  'beverage',
  'beverages',
  'alcoholic beverage',
  'alcoholic beverages',
] as const;

export const BEVERAGE_DISPLAY_MODIFIERS = [
  'black',
  'carbonated',
  'chocolate',
  'cold brew',
  'dark',
  'decaf',
  'green',
  'herbal',
  'iced',
  'lemon',
  'light',
  'mineral',
  'red',
  'sparkling',
  'strawberry',
  'vanilla',
  'white',
] as const;

/**
 * USDA commonly places the product descriptor after a broad category. The
 * category grammar uses these forms to build a natural patient-facing name
 * without maintaining per-food mappings.
 */
export const CATEGORY_PRODUCT_FORM_TYPES: Readonly<
  Record<string, { singular: string; plural: string }>
> = {
  bean: { singular: 'Bean', plural: 'Beans' },
  beans: { singular: 'Bean', plural: 'Beans' },
  candy: { singular: 'Candy', plural: 'Candies' },
  candies: { singular: 'Candy', plural: 'Candies' },
  gravy: { singular: 'Gravy', plural: 'Gravy' },
  muffin: { singular: 'Muffin', plural: 'Muffins' },
  muffins: { singular: 'Muffin', plural: 'Muffins' },
  oil: { singular: 'Oil', plural: 'Oil' },
  oils: { singular: 'Oil', plural: 'Oil' },
  potato: { singular: 'Potato', plural: 'Potatoes' },
  potatoes: { singular: 'Potato', plural: 'Potatoes' },
  roll: { singular: 'Roll', plural: 'Rolls' },
  rolls: { singular: 'Roll', plural: 'Rolls' },
  sauce: { singular: 'Sauce', plural: 'Sauces' },
  sauces: { singular: 'Sauce', plural: 'Sauces' },
  tomato: { singular: 'Tomato', plural: 'Tomatoes' },
  tomatoes: { singular: 'Tomato', plural: 'Tomatoes' },
};

export const MEAT_CUT_COMPOUND_TOKENS = new Set([
  'top',
  'bottom',
  'eye',
  'short',
  'back',
  'baby back',
  'country style',
  'center',
  'center cut',
  'bone in',
  'boneless',
]);

export const MEAT_TRIM_AND_BONE_DESCRIPTORS = new Set([
  'bone in',
  'boneless',
  'external fat',
  'flesh and skin',
  'flesh only',
  'lean only',
  'meat and skin',
  'meat only',
  'separable lean',
  'skinless',
  'with skin',
  'with refuse',
  'without refuse',
]);

export const MEAT_QUALITY_DESCRIPTORS = new Set([
  'choice',
  'grade a',
  'grade b',
  'prime',
  'select',
]);

export const MEAT_PROCESSING_DESCRIPTORS = new Set([
  'broilers or fryers',
  'cooked',
  'raw',
  'fresh',
  'frozen',
  'canned',
  'dried',
  'smoked',
  'processed',
]);
