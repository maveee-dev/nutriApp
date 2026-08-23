import {
  FOOD_PREPARATIONS,
  FOOD_STATES,
  MEAT_ANIMALS,
  MEAT_CUTS,
} from './food-presentation-vocabulary.js';

export interface FoodGrammarAnalysisRecord {
  readonly id: string;
  readonly name: string;
  readonly source?: string | null;
  readonly sourceId?: string | null;
}

export interface GrammarTermFrequency {
  readonly term: string;
  readonly count: number;
  readonly percentage: number;
}

export interface GrammarCombinationFrequency {
  readonly terms: readonly string[];
  readonly count: number;
  readonly percentage: number;
}

export interface FoodPresentationGrammarAnalysisReport {
  readonly report: 'food-presentation-grammar-analysis';
  readonly generatedAt: string;
  readonly readOnly: true;
  readonly totalFoods: number;
  readonly meatAndPoultry: {
    readonly animals: readonly GrammarTermFrequency[];
    readonly cuts: readonly GrammarTermFrequency[];
    readonly preparations: readonly GrammarTermFrequency[];
    readonly states: readonly GrammarTermFrequency[];
    readonly animalCutCombinations: readonly GrammarCombinationFrequency[];
  };
  readonly fishAndSeafood: {
    readonly species: readonly GrammarTermFrequency[];
    readonly seafoodTypes: readonly GrammarTermFrequency[];
    readonly preparations: readonly GrammarTermFrequency[];
    readonly states: readonly GrammarTermFrequency[];
  };
  readonly cheeseAndDairy: {
    readonly cheeseVarieties: readonly GrammarTermFrequency[];
    readonly milkTypes: readonly GrammarTermFrequency[];
    readonly yogurtTypes: readonly GrammarTermFrequency[];
    readonly butterCreamAndOther: readonly GrammarTermFrequency[];
  };
  readonly nutsAndSeeds: readonly GrammarTermFrequency[];
  readonly beverages: readonly GrammarTermFrequency[];
  readonly descriptorVocabulary: {
    readonly preparationWords: readonly GrammarTermFrequency[];
    readonly stateWords: readonly GrammarTermFrequency[];
    readonly qualityDescriptors: readonly GrammarTermFrequency[];
    readonly sizeDescriptors: readonly GrammarTermFrequency[];
    readonly processingDescriptors: readonly GrammarTermFrequency[];
  };
  readonly highImpactReusableRules: readonly {
    readonly rule: string;
    readonly rationale: string;
    readonly evidenceCount: number;
    readonly percentage: number;
    readonly examples: readonly string[];
  }[];
  readonly ambiguousTerms: readonly {
    readonly term: string;
    readonly count: number;
    readonly reason: string;
  }[];
}

const ADMINISTRATIVE_PARENTHETICAL =
  /\s*\((?:[^)]*\bUSDA\b[^)]*|[^)]*Food Distribution Program[^)]*)\)/gi;

const FISH_SPECIES = [
  'anchovy',
  'bass',
  'catfish',
  'cod',
  'crab',
  'haddock',
  'halibut',
  'herring',
  'mackerel',
  'mahi mahi',
  'pollock',
  'salmon',
  'sardine',
  'snapper',
  'swordfish',
  'trout',
  'tuna',
  'tilapia',
  'whitefish',
] as const;

const SEAFOOD_TYPES = [
  'clam',
  'crab',
  'fish',
  'lobster',
  'mussel',
  'oyster',
  'scallop',
  'seafood',
  'shrimp',
  'squid',
  'shellfish',
] as const;

const CHEESE_VARIETIES = [
  'american',
  'asiago',
  'brie',
  'cheddar',
  'colby',
  'cottage',
  'cream cheese',
  'feta',
  'gouda',
  'goat cheese',
  'monterey jack',
  'mozzarella',
  'parmesan',
  'provolone',
  'ricotta',
  'roquefort',
  'swiss',
] as const;

const MILK_TYPES = [
  'almond',
  'buttermilk',
  'chocolate',
  'condensed',
  'evaporated',
  'goat',
  'low fat',
  'nonfat',
  'powdered',
  'skim',
  'soy',
  'whole',
] as const;

const YOGURT_TYPES = [
  'greek',
  'low fat',
  'nonfat',
  'plain',
  'regular',
  'vanilla',
  'whole milk',
  'yogurt',
] as const;

const BUTTER_CREAM_OTHER = [
  'butter',
  'cream',
  'half and half',
  'margarine',
  'sour cream',
] as const;

const NUTS_AND_SEEDS = [
  'almond',
  'cashew',
  'chestnut',
  'coconut',
  'hazelnut',
  'macadamia',
  'peanut',
  'pecan',
  'pistachio',
  'sesame',
  'sunflower',
  'tahini',
  'walnut',
] as const;

const BEVERAGE_TYPES = [
  'alcoholic beverage',
  'beer',
  'coffee',
  'energy drink',
  'juice',
  'milk',
  'soda',
  'soft drink',
  'tea',
  'water',
  'wine',
] as const;

const QUALITY_DESCRIPTORS = [
  'choice',
  'extra crispy',
  'grade a',
  'grade b',
  'jumbo',
  'prime',
  'select',
] as const;

const SIZE_DESCRIPTORS = [
  'extra large',
  'large',
  'medium',
  'small',
  'jumbo',
  'mini',
] as const;

const PROCESSING_DESCRIPTORS = [
  'concentrated',
  'dehydrated',
  'fortified',
  'glucose reduced',
  'hydrolyzed',
  'imitation',
  'instant',
  'low sodium',
  'pasteurized',
  'powdered',
  'reduced fat',
  'reduced sodium',
  'textured',
] as const;

const AMBIGUOUS_TERMS: Readonly<Record<string, string>> = {
  butter: 'May be dairy butter, nut butter, seed butter, or a prepared ingredient.',
  cream: 'May be a dairy product, a soup/sauce base, or a flavor descriptor.',
  cooked: 'Describes preparation state but may also occur inside a dish name.',
  ground: 'May be a meat cut, coffee form, spice form, or processed ingredient.',
  milk: 'May be dairy milk, plant milk, milk powder, or a food ingredient.',
  oil: 'May be cooking oil, fish oil, nut oil, or a prepared product.',
  roast: 'May be a meat cut, a preparation method, or a dish name.',
  raw: 'Usually a state descriptor but can be part of a canonical product name.',
  tea: 'May be a beverage, an ingredient, or a flavor descriptor.',
  whole: 'Often a redundant quality descriptor, but can distinguish a food form.',
};

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function foodText(name: string): string {
  return normalizeText(name.replace(ADMINISTRATIVE_PARENTHETICAL, ' '));
}

function containsTerm(text: string, term: string): boolean {
  const normalizedTerm = normalizeText(term);
  return normalizedTerm.length > 0 && ` ${text} `.includes(` ${normalizedTerm} `);
}

function isMeatOrPoultryRecord(record: FoodGrammarAnalysisRecord): boolean {
  const text = foodText(record.name);
  return MEAT_ANIMALS.some((term) => containsTerm(text, term));
}

function isFishOrSeafoodRecord(record: FoodGrammarAnalysisRecord): boolean {
  const text = foodText(record.name);
  return (
    FISH_SPECIES.some((term) => containsTerm(text, term)) ||
    SEAFOOD_TYPES.some((term) => containsTerm(text, term))
  );
}

function isCheeseOrDairyRecord(record: FoodGrammarAnalysisRecord): boolean {
  const text = foodText(record.name);
  return /\b(?:cheese|milk|yogurt|butter|cream|margarine|dairy|whey|curd)\b/.test(text);
}

function isNutOrSeedRecord(record: FoodGrammarAnalysisRecord): boolean {
  const text = foodText(record.name);
  return (
    /\b(?:nut|nuts|seed|seeds)\b/.test(text) ||
    NUTS_AND_SEEDS.some((term) => containsTerm(text, term))
  );
}

function isBeverageRecord(record: FoodGrammarAnalysisRecord): boolean {
  const text = foodText(record.name);
  return BEVERAGE_TYPES.some((term) => containsTerm(text, term));
}

function percentage(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 10000) / 100;
}

function frequencies(
  records: readonly FoodGrammarAnalysisRecord[],
  terms: readonly string[],
  filter: (record: FoodGrammarAnalysisRecord) => boolean = () => true,
): readonly GrammarTermFrequency[] {
  const counts = terms.map((term) => ({
    term,
    count: records.filter(
      (record) => filter(record) && containsTerm(foodText(record.name), term),
    ).length,
  }));
  return counts
    .filter(({ count }) => count > 0)
    .sort((left, right) => right.count - left.count || left.term.localeCompare(right.term))
    .map(({ term, count }) => ({
      term,
      count,
      percentage: percentage(count, records.length),
    }));
}

function combinations(
  records: readonly FoodGrammarAnalysisRecord[],
  leftTerms: readonly string[],
  rightTerms: readonly string[],
): readonly GrammarCombinationFrequency[] {
  const rows: GrammarCombinationFrequency[] = [];
  for (const left of leftTerms) {
    for (const right of rightTerms) {
      const count = records.filter((record) => {
        const text = foodText(record.name);
        return containsTerm(text, left) && containsTerm(text, right);
      }).length;
      if (count > 0) rows.push({ terms: [left, right], count, percentage: percentage(count, records.length) });
    }
  }
  return rows.sort(
    (left, right) =>
      right.count - left.count || left.terms.join(' ').localeCompare(right.terms.join(' ')),
  );
}

function examplesFor(
  records: readonly FoodGrammarAnalysisRecord[],
  terms: readonly string[],
  filter: (record: FoodGrammarAnalysisRecord) => boolean = () => true,
  limit = 5,
): readonly string[] {
  const result: string[] = [];
  for (const record of records) {
    const text = foodText(record.name);
    if (filter(record) && terms.some((term) => containsTerm(text, term))) {
      result.push(record.name);
      if (result.length >= limit) break;
    }
  }
  return result;
}

export function analyzeFoodPresentationGrammar(
  records: readonly FoodGrammarAnalysisRecord[],
  generatedAt = new Date().toISOString(),
): FoodPresentationGrammarAnalysisReport {
  const totalFoods = records.length;
  const descriptor = {
    preparationWords: frequencies(records, FOOD_PREPARATIONS),
    stateWords: frequencies(records, FOOD_STATES),
    qualityDescriptors: frequencies(records, QUALITY_DESCRIPTORS),
    sizeDescriptors: frequencies(records, SIZE_DESCRIPTORS),
    processingDescriptors: frequencies(records, PROCESSING_DESCRIPTORS),
  };

  const rules = [
    {
      rule: 'animal-plus-cut',
      rationale: 'Promote an animal and cut together, while leaving state and preparation descriptors in variantLabel.',
      combinations: combinations(records, MEAT_ANIMALS, MEAT_CUTS),
      examples: examplesFor(records, [...MEAT_ANIMALS, ...MEAT_CUTS]),
    },
    {
      rule: 'fish-species-first',
      rationale: 'Promote a fish species or seafood type instead of the generic Fish category.',
      combinations: frequencies(records, FISH_SPECIES, isFishOrSeafoodRecord),
      examples: examplesFor(records, FISH_SPECIES, isFishOrSeafoodRecord),
    },
    {
      rule: 'cheese-variety-first',
      rationale: 'Promote the cheese variety or product form and retain processing descriptors as variants.',
      combinations: frequencies(records, CHEESE_VARIETIES, isCheeseOrDairyRecord),
      examples: examplesFor(records, CHEESE_VARIETIES, isCheeseOrDairyRecord),
    },
    {
      rule: 'beverage-type-first',
      rationale: 'Promote the beverage type or product instead of Alcoholic Beverage or Beverages as the title.',
      combinations: frequencies(records, BEVERAGE_TYPES, isBeverageRecord),
      examples: examplesFor(records, BEVERAGE_TYPES, isBeverageRecord),
    },
  ];

  const highImpactReusableRules = rules
    .map((rule) => {
      const evidenceCount = rule.combinations.reduce((sum, row) => sum + row.count, 0);
      return {
        rule: rule.rule,
        rationale: rule.rationale,
        evidenceCount,
        percentage: percentage(evidenceCount, totalFoods),
        examples: rule.examples,
      };
    })
    .concat([
      {
        rule: 'state-and-preparation-as-variants',
        rationale: 'Keep raw/cooked/frozen/dried and grilled/roasted/fried descriptors secondary unless they define a distinct dish.',
        evidenceCount: new Set(
          records
            .filter((record) =>
              [...FOOD_PREPARATIONS, ...FOOD_STATES].some((term) => containsTerm(foodText(record.name), term)),
            )
            .map((record) => record.id),
        ).size,
        percentage: percentage(
          records.filter((record) =>
            [...FOOD_PREPARATIONS, ...FOOD_STATES].some((term) => containsTerm(foodText(record.name), term)),
          ).length,
          totalFoods,
        ),
        examples: examplesFor(records, [...FOOD_PREPARATIONS, ...FOOD_STATES]),
      },
    ])
    .sort((left, right) => right.evidenceCount - left.evidenceCount || left.rule.localeCompare(right.rule));

  const ambiguousTerms = Object.entries(AMBIGUOUS_TERMS)
    .map(([term, reason]) => ({
      term,
      count: records.filter((record) => containsTerm(foodText(record.name), term)).length,
      reason,
    }))
    .filter(({ count }) => count > 0)
    .sort((left, right) => right.count - left.count || left.term.localeCompare(right.term));

  return {
    report: 'food-presentation-grammar-analysis',
    generatedAt,
    readOnly: true,
    totalFoods,
    meatAndPoultry: {
      animals: frequencies(records, MEAT_ANIMALS, isMeatOrPoultryRecord),
      cuts: frequencies(records, MEAT_CUTS, isMeatOrPoultryRecord),
      preparations: frequencies(records, FOOD_PREPARATIONS, isMeatOrPoultryRecord),
      states: frequencies(records, FOOD_STATES, isMeatOrPoultryRecord),
      animalCutCombinations: combinations(records, MEAT_ANIMALS, MEAT_CUTS),
    },
    fishAndSeafood: {
      species: frequencies(records, FISH_SPECIES, isFishOrSeafoodRecord),
      seafoodTypes: frequencies(records, SEAFOOD_TYPES, isFishOrSeafoodRecord),
      preparations: frequencies(records, FOOD_PREPARATIONS, isFishOrSeafoodRecord),
      states: frequencies(records, FOOD_STATES, isFishOrSeafoodRecord),
    },
    cheeseAndDairy: {
      cheeseVarieties: frequencies(records, CHEESE_VARIETIES, isCheeseOrDairyRecord),
      milkTypes: frequencies(records, MILK_TYPES, isCheeseOrDairyRecord),
      yogurtTypes: frequencies(records, YOGURT_TYPES, isCheeseOrDairyRecord),
      butterCreamAndOther: frequencies(records, BUTTER_CREAM_OTHER, isCheeseOrDairyRecord),
    },
    nutsAndSeeds: frequencies(records, NUTS_AND_SEEDS, isNutOrSeedRecord),
    beverages: frequencies(records, BEVERAGE_TYPES, isBeverageRecord),
    descriptorVocabulary: descriptor,
    highImpactReusableRules,
    ambiguousTerms,
  };
}

function renderFrequencyRows(rows: readonly GrammarTermFrequency[]): string {
  if (rows.length === 0) return 'None.';
  return rows.map((row) => `- ${row.term}: ${row.count} (${row.percentage.toFixed(2)}%)`).join('\n');
}

function renderCombinationRows(rows: readonly GrammarCombinationFrequency[]): string {
  if (rows.length === 0) return 'None.';
  return rows
    .map((row) => `- ${row.terms.join(' + ')}: ${row.count} (${row.percentage.toFixed(2)}%)`)
    .join('\n');
}

export function formatFoodPresentationGrammarAnalysis(
  report: FoodPresentationGrammarAnalysisReport,
): string {
  const category = (title: string, body: string): string => `${title}\n${'-'.repeat(title.length)}\n${body}`;
  const rules = report.highImpactReusableRules
    .map(
      (rule, index) =>
        `${index + 1}. ${rule.rule} — ${rule.evidenceCount} foods (${rule.percentage.toFixed(2)}%)\n   ${rule.rationale}\n   Examples: ${rule.examples.join(' | ') || 'none'}`,
    )
    .join('\n\n');
  const ambiguous = report.ambiguousTerms.length === 0
    ? 'None.'
    : report.ambiguousTerms
        .map((term) => `- ${term.term}: ${term.count} (${term.reason})`)
        .join('\n');

  return [
    'NutriApp Food Presentation Grammar Analysis',
    '============================================',
    `Generated: ${report.generatedAt}`,
    'Read-only: yes',
    `Total foods: ${report.totalFoods}`,
    '',
    category(
      'Meat & Poultry',
      [
        'Animals',
        renderFrequencyRows(report.meatAndPoultry.animals),
        '',
        'Cuts',
        renderFrequencyRows(report.meatAndPoultry.cuts),
        '',
        'Preparations',
        renderFrequencyRows(report.meatAndPoultry.preparations),
        '',
        'States',
        renderFrequencyRows(report.meatAndPoultry.states),
        '',
        'Animal + cut combinations',
        renderCombinationRows(report.meatAndPoultry.animalCutCombinations),
      ].join('\n'),
    ),
    '',
    category(
      'Fish & Seafood',
      [
        'Species',
        renderFrequencyRows(report.fishAndSeafood.species),
        '',
        'Seafood types',
        renderFrequencyRows(report.fishAndSeafood.seafoodTypes),
        '',
        'Preparations',
        renderFrequencyRows(report.fishAndSeafood.preparations),
        '',
        'States',
        renderFrequencyRows(report.fishAndSeafood.states),
      ].join('\n'),
    ),
    '',
    category(
      'Cheese & Dairy',
      [
        'Cheese varieties',
        renderFrequencyRows(report.cheeseAndDairy.cheeseVarieties),
        '',
        'Milk types',
        renderFrequencyRows(report.cheeseAndDairy.milkTypes),
        '',
        'Yogurt types',
        renderFrequencyRows(report.cheeseAndDairy.yogurtTypes),
        '',
        'Butter, cream, and other dairy terms',
        renderFrequencyRows(report.cheeseAndDairy.butterCreamAndOther),
      ].join('\n'),
    ),
    '',
    category('Nuts & Seeds', renderFrequencyRows(report.nutsAndSeeds)),
    '',
    category('Beverages', renderFrequencyRows(report.beverages)),
    '',
    category(
      'Common Descriptor Vocabulary',
      [
        'Preparation words',
        renderFrequencyRows(report.descriptorVocabulary.preparationWords),
        '',
        'State words',
        renderFrequencyRows(report.descriptorVocabulary.stateWords),
        '',
        'Quality descriptors',
        renderFrequencyRows(report.descriptorVocabulary.qualityDescriptors),
        '',
        'Size descriptors',
        renderFrequencyRows(report.descriptorVocabulary.sizeDescriptors),
        '',
        'Processing descriptors',
        renderFrequencyRows(report.descriptorVocabulary.processingDescriptors),
      ].join('\n'),
    ),
    '',
    category('Highest-Impact Reusable Grammar Rules', rules || 'None.'),
    '',
    category('Ambiguous Terms Requiring Caution', ambiguous),
    '',
    'Interpretation',
    '--------------',
    'Counts represent foods whose canonical names contain each normalized term at least once.',
    'They are planning signals for reusable grammar, not automatic approval to promote a term into displayName.',
    'Quality, size, state, preparation, brand, and category terms should generally remain variantLabel candidates unless the grammar rule establishes that they define the food concept.',
    '',
  ].join('\n');
}
