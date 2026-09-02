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
  'back',
  'breast',
  'brisket',
  'chop',
  'chuck',
  'cutlet',
  'dark meat',
  'drumstick',
  'flank',
  'filet',
  'fillet',
  'ground',
  'leg',
  'light meat',
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

/**
 * Ripeness descriptors that can form a natural patient-facing title when
 * USDA places them after a simple produce noun. These are descriptor rules,
 * not food-record mappings.
 */
export const FOOD_RIPENESS_DISPLAY_LABELS: Readonly<Record<string, string>> = {
  ripe: 'Ripe',
  'ripe and slightly ripe': 'Ripe',
  overripe: 'Overripe',
} as const;

/**
 * Simple produce names for which a bare raw record reads naturally without a
 * separate "Raw" variant. This is intentionally a small vocabulary boundary;
 * prepared, packaged, and compound foods continue through ordinary grammar.
 */
export const NATURALLY_RAW_PRODUCE_HEADS = [
  'apple',
  'apples',
  'banana',
  'bananas',
  'berry',
  'berries',
  'grape',
  'grapes',
  'mango',
  'mangoes',
  'orange',
  'oranges',
  'peach',
  'peaches',
  'pear',
  'pears',
  'pineapple',
  'pineapples',
  'plum',
  'plums',
  'strawberry',
  'strawberries',
  'watermelon',
  'watermelons',
] as const;

/**
 * Descriptors that identify a commonly selected food variety rather than a
 * preparation or storage state. These are intentionally shared vocabulary,
 * not food-specific mappings: the presentation grammar can promote them
 * before a generic food head (for example, "white" + "rice" -> "White Rice")
 * while leaving the remaining descriptors in the variant label.
 */
export const FOOD_IDENTITY_DESCRIPTORS = [
  'almond',
  'arborio',
  'basmati',
  'black',
  'blue',
  'brown',
  'buttermilk',
  'cheddar',
  'chocolate',
  'coconut',
  'colby',
  'cottage',
  'dry',
  'evaporated',
  'feta',
  'fat free',
  'fluid',
  'fuji',
  'gala',
  'green',
  'goat',
  'glutinous',
  'gouda',
  'golden delicious',
  'granny smith',
  'greek',
  'honeycrisp',
  'jasmine',
  'long grain',
  'low fat',
  'medium grain',
  'mcintosh',
  'mozzarella',
  'nonfat',
  'oat',
  'parmesan',
  'plain',
  'provolone',
  'red delicious',
  'reduced fat',
  'ricotta',
  'russet',
  'rye',
  'short grain',
  'skim',
  'sourdough',
  'sticky',
  'soy',
  'swiss',
  'sweet',
  'vanilla',
  'wheat',
  'white',
  'whole',
  'whole wheat',
  'wild',
  'yellow',
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
  cereal: { singular: 'Cereal', plural: 'Cereals' },
  cereals: { singular: 'Cereal', plural: 'Cereals' },
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
