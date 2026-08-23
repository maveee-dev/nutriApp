import {
  normalizeFoodSearchText,
  resolveFoodPresentation,
} from './food-presentation.service.js';
import type { FoodPresentationMetadata } from '../types/food-presentation.type.js';

export type FoodPresentationAuditSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type FoodPresentationAuditIssueType =
  | 'incorrect-primary-concept'
  | 'generic-category-title'
  | 'brand-used-as-title'
  | 'grammar-or-pluralization'
  | 'duplicate-display-name'
  | 'empty-or-redundant-variant';

export type FoodPresentationGrammarRule =
  | 'cheese-types'
  | 'meat-cuts'
  | 'fish-species'
  | 'beverages'
  | 'nuts-and-seeds'
  | 'mixed-dishes'
  | 'ethnic-foods'
  | 'branded-foods'
  | 'prepared-meals'
  | 'compound-foods'
  | 'pluralization'
  | 'variant-labels'
  | 'duplicate-display-names'
  | 'category-titles'
  | 'general-presentation';

export interface FoodPresentationAuditRecord {
  readonly id: string;
  readonly name: string;
  readonly source?: string | null;
  readonly sourceId?: string | null;
  readonly presentation?: FoodPresentationMetadata | null;
}

export interface FoodPresentationAuditFinding {
  readonly issueType: FoodPresentationAuditIssueType;
  readonly severity: FoodPresentationAuditSeverity;
  readonly foodId: string;
  readonly canonicalName: string;
  readonly displayName: string;
  readonly variantLabel: string | null;
  readonly reason: string;
  readonly grammarRule: FoodPresentationGrammarRule;
  readonly relatedFoodIds?: readonly string[];
}

export interface FoodPresentationDuplicateGroup {
  readonly displayName: string;
  readonly normalizedDisplayName: string;
  readonly count: number;
  readonly foods: readonly {
    readonly id: string;
    readonly canonicalName: string;
    readonly variantLabel: string | null;
  }[];
}

export interface FoodPresentationGrammarRuleGroup {
  readonly grammarRule: FoodPresentationGrammarRule;
  readonly description: string;
  readonly issueCount: number;
  readonly foodCount: number;
  readonly issueTypes: readonly FoodPresentationAuditIssueType[];
  readonly findings: readonly FoodPresentationAuditFinding[];
}

export interface FoodPresentationQualityAuditReport {
  readonly report: 'food-presentation-quality';
  readonly generatedAt: string;
  readonly readOnly: true;
  readonly summary: {
    readonly totalFoods: number;
    readonly foodsWithIssues: number;
    readonly issueCounts: Readonly<Record<FoodPresentationAuditIssueType, number>>;
    readonly needsManualReview: number;
    readonly needsManualReviewPercentage: number;
    readonly confidence: Readonly<Record<'high' | 'medium' | 'low', number>>;
  };
  readonly reviewBySeverity: Readonly<
    Record<FoodPresentationAuditSeverity, readonly FoodPresentationAuditFinding[]>
  >;
  readonly duplicateDisplayNameGroups: readonly FoodPresentationDuplicateGroup[];
  readonly issuesByGrammarRule: readonly FoodPresentationGrammarRuleGroup[];
}

const ADMINISTRATIVE_PARENTHETICAL =
  /\s*\((?:[^)]*\bUSDA\b[^)]*|[^)]*Food Distribution Program[^)]*)\)/gi;

const GENERIC_PRIMARY_TITLES = new Set([
  'alcoholic beverage',
  'bean',
  'beef',
  'beverage',
  'bread',
  'candy',
  'cheese',
  'cheese food',
  'cheese product',
  'chicken',
  'duck',
  'fish',
  'fish oil',
  'food',
  'game meat',
  'gravy',
  'infant formula',
  'lamb',
  'muffin',
  'nut',
  'noodle',
  'oil',
  'peach',
  'potato',
  'pork',
  'roll',
  'sauce',
  'soup',
  'tomato',
  'turkey',
  'veal',
]);

const NON_FOOD_DESCRIPTORS = new Set([
  'all',
  'baked',
  'boiled',
  'canned',
  'cooked',
  'dehydrated',
  'dried',
  'fresh',
  'frozen',
  'from recipe',
  'grilled',
  'ground',
  'imported',
  'low sodium',
  'pasteurized',
  'plain',
  'raw',
  'ready to eat',
  'roasted',
  'salted',
  'smoked',
  'steamed',
  'unsalted',
  'whole',
  'with added',
  'without added',
]);

const PRODUCT_BRAND_EXCEPTIONS = new Set([
  'coca cola',
  'doritos',
  'gatorade',
  'mountain dew',
  'nutella',
  'oreo',
  'pepsi',
  'pringles',
  'red bull',
  'reeses fast break',
  'spam',
  'yakult',
]);

const KNOWN_BRAND_WORDS = new Set([
  'abbott',
  'applebees',
  'burger king',
  'campbells',
  'clif bar',
  'coca cola',
  'frito lay',
  'fritolay',
  'healthy choice',
  'heinz',
  'kfc',
  'kraft',
  'mcdonalds',
  'quaker',
  'starbucks',
  'wendys',
]);

const GRAMMAR_ERROR_PATTERNS: readonly { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\bcooky\b/i,
    reason: 'Incorrect singularization produced “Cooky” instead of “Cookie”.',
  },
  {
    pattern: /\bpeache\b/i,
    reason: 'Incorrect singularization produced “Peache” instead of “Peach”.',
  },
  {
    pattern: /\btomatoe\b/i,
    reason: 'Incorrect singularization produced “Tomatoe” instead of “Tomato”.',
  },
  {
    pattern: /\bpotatoe\b/i,
    reason: 'Incorrect singularization produced “Potatoe” instead of “Potato”.',
  },
  {
    pattern: /(?:^|\s)[A-Za-z]+['’]$/,
    reason: 'Display name contains a trailing apostrophe caused by brand normalization.',
  },
];

const GRAMMAR_RULE_DESCRIPTIONS: Readonly<
  Record<FoodPresentationGrammarRule, string>
> = {
  'cheese-types': 'Promote cheese type or cheese product descriptors into the primary name.',
  'meat-cuts': 'Promote meat species and cut/preparation descriptors into the primary name.',
  'fish-species': 'Promote fish or seafood species and product descriptors into the primary name.',
  beverages: 'Promote the beverage type or product instead of using a broad beverage category.',
  'nuts-and-seeds': 'Promote the nut, seed, or nut-product descriptor into the primary name.',
  'mixed-dishes': 'Extract the recognizable dish from category, cuisine, and preparation segments.',
  'ethnic-foods': 'Keep the recognizable dish primary and use cuisine or culture as secondary context.',
  'branded-foods': 'Keep the product primary and move the brand to the variant label unless the brand is the product.',
  'prepared-meals': 'Extract the prepared meal or menu item from restaurant, frozen, baby-food, or ready-to-eat metadata.',
  'compound-foods': 'Apply reusable inverted compound grammar such as “Bread, X” to “X Bread”.',
  pluralization: 'Correct deterministic singularization and plural normalization.',
  'variant-labels': 'Remove empty, duplicated, or redundant variant descriptors.',
  'duplicate-display-names': 'Ensure the effective display name and variant label distinguish separate foods.',
  'category-titles': 'Avoid using a broad USDA category as the primary patient-facing food name.',
  'general-presentation': 'Review the presentation using the canonical name and effective presentation fields.',
};

const SEVERITY_ORDER: Record<FoodPresentationAuditSeverity, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

const ISSUE_SEVERITY: Record<FoodPresentationAuditIssueType, FoodPresentationAuditSeverity> = {
  'incorrect-primary-concept': 'HIGH',
  'generic-category-title': 'HIGH',
  'brand-used-as-title': 'MEDIUM',
  'grammar-or-pluralization': 'HIGH',
  'duplicate-display-name': 'LOW',
  'empty-or-redundant-variant': 'LOW',
};

function canonicalSegments(canonicalName: string): readonly string[] {
  return canonicalName
    .replace(ADMINISTRATIVE_PARENTHETICAL, '')
    .split(',')
    .map((segment) => segment.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function normalizeSegment(segment: string): string {
  return normalizeFoodSearchText(segment);
}

function isGenericPrimaryTitle(displayName: string): boolean {
  return GENERIC_PRIMARY_TITLES.has(normalizeFoodSearchText(displayName));
}

function hasPromotableFoodConcept(segments: readonly string[]): boolean {
  return segments.slice(1).some((segment) => {
    const normalized = normalizeSegment(segment);
    if (!normalized || NON_FOOD_DESCRIPTORS.has(normalized)) return false;

    const tokens = normalized.split(' ');
    return tokens.some(
      (token) =>
        token.length > 2 &&
        !NON_FOOD_DESCRIPTORS.has(token) &&
        !['and', 'or', 'only', 'with', 'without'].includes(token),
    );
  });
}

function stripPossessive(value: string): string {
  return normalizeFoodSearchText(value)
    .replace(/\s+s$/i, '')
    .replace(/s$/i, '');
}

function isProductBrand(segment: string): boolean {
  return PRODUCT_BRAND_EXCEPTIONS.has(stripPossessive(segment));
}

function isLikelyBrandSegment(segment: string): boolean {
  const normalized = stripPossessive(segment);
  if (!normalized || isProductBrand(segment)) return false;
  if (KNOWN_BRAND_WORDS.has(normalized)) return true;

  const letters = segment.replace(/[^A-Za-z]/g, '');
  const isAllCapsBrand =
    letters.length >= 2 && letters === letters.toUpperCase();
  const isTitleCasePossessive =
    /^[A-Z][A-Za-z]*(?:['’]s)$/u.test(segment.trim());
  return isTitleCasePossessive || isAllCapsBrand;
}

function findBrandUsedAsTitle(
  segments: readonly string[],
  displayName: string,
): string | null {
  const brandIndex = segments.findIndex(isLikelyBrandSegment);
  if (brandIndex < 0) return null;

  const brand = segments[brandIndex]!;
  if (isProductBrand(brand)) return null;

  const hasProductAfterBrand = segments
    .slice(brandIndex + 1)
    .some((segment) => normalizeSegment(segment).length > 0);
  if (!hasProductAfterBrand) return null;

  const display = normalizeFoodSearchText(displayName);
  const normalizedBrand = normalizeSegment(brand);
  const strippedBrand = stripPossessive(brand);
  if (
    display === normalizedBrand ||
    display === strippedBrand ||
    display.startsWith(`${strippedBrand} `)
  ) {
    return `Brand “${brand}” is being used as the primary title while the canonical name contains a product after it.`;
  }

  return null;
}

function findGrammarIssue(displayName: string): string | null {
  const repeatedWord = displayName.match(/\b([A-Za-z]+)\s+\1\b/i);
  if (repeatedWord) {
    return `Repeated word “${repeatedWord[1]}” appears in the display name.`;
  }

  return (
    GRAMMAR_ERROR_PATTERNS.find(({ pattern }) => pattern.test(displayName))
      ?.reason ?? null
  );
}

function findVariantIssue(
  displayName: string,
  variantLabel: string | null,
): string | null {
  if (variantLabel == null || variantLabel.trim() === '') {
    return variantLabel === '' ? 'Variant label is empty.' : null;
  }

  const labels = variantLabel
    .split('·')
    .map((label) => label.trim())
    .filter(Boolean);
  const normalizedLabels = labels.map(normalizeFoodSearchText);
  const duplicates = normalizedLabels.filter(
    (label, index) => normalizedLabels.indexOf(label) !== index,
  );
  if (duplicates.length > 0) {
    return 'Variant label repeats the same descriptor more than once.';
  }

  if (normalizeFoodSearchText(variantLabel) === normalizeFoodSearchText(displayName)) {
    return 'Variant label duplicates the primary display name.';
  }

  return null;
}

function variantDistinctionKey(variantLabel: string | null): string {
  if (variantLabel == null || variantLabel.trim() === '') return '';
  return variantLabel
    .split('·')
    .map(normalizeFoodSearchText)
    .filter(Boolean)
    .sort()
    .join('|');
}

function inferGrammarRule(
  record: { readonly name: string; readonly segments: readonly string[] },
  issueType: FoodPresentationAuditIssueType,
  reason: string,
): FoodPresentationGrammarRule {
  if (issueType === 'duplicate-display-name') return 'duplicate-display-names';
  if (issueType === 'empty-or-redundant-variant') return 'variant-labels';
  if (issueType === 'brand-used-as-title') return 'branded-foods';

  const normalizedName = normalizeFoodSearchText(record.name);
  const first = normalizeSegment(record.segments[0] ?? '');

  if (/\bcheese\b/.test(normalizedName)) return 'cheese-types';
  if (
    /^(?:beef|pork|lamb|veal|turkey|chicken|duck|game meat)\b/.test(first) ||
    /\b(?:tenderloin|sirloin|loin|chop|roast|steak|breast|thigh|wing|drumstick|shank|ground)\b/.test(
      normalizedName,
    )
  ) {
    return 'meat-cuts';
  }
  if (/^(?:fish|fish oil|finfish|shellfish|seafood)\b/.test(first)) {
    return 'fish-species';
  }
  if (
    /^(?:beverages?|alcoholic beverages?)\b/.test(first) ||
    /^(?:juice|milk|tea|coffee|wine|beer|drink)\b/.test(normalizedName)
  ) {
    return 'beverages';
  }
  if (
    /^(?:nuts?|seeds?|nut and seed products)\b/.test(first) ||
    /\b(?:almond|walnut|pecan|pistachio|cashew|hazelnut|acorn|peanut)\b/.test(
      normalizedName,
    )
  ) {
    return 'nuts-and-seeds';
  }
  if (
    /\b(?:chinese|japanese|korean|thai|mexican|latino|filipino|indian|mediterranean|asian|middle eastern)\b/.test(
      normalizedName,
    )
  ) {
    return 'ethnic-foods';
  }
  if (
    /^(?:fast food|fast foods|restaurant|frozen meal|frozen meals|babyfood|baby food|meals?[, ])/.test(
      first,
    ) ||
    /\b(?:ready to eat|ready-to-eat|prepared meal|menu|casserole|entree|entrée)\b/.test(
      normalizedName,
    )
  ) {
    return 'prepared-meals';
  }
  if (
    /\b(?:pizza|sandwich|salad|soup|stew|casserole|pasta|noodle|dumpling|burrito|wrap)\b/.test(
      normalizedName,
    )
  ) {
    return 'mixed-dishes';
  }
  if (/^(?:bread|breads|cereal|cereals|cookie|cookies|pie|pies|soup|soups)\b/.test(first)) {
    return 'compound-foods';
  }
  if (
    issueType === 'grammar-or-pluralization' ||
    /singularization|pluralization|apostrophe|Cooky|Peache|Tomatoe|Potatoe/i.test(reason)
  ) {
    return 'pluralization';
  }
  if (issueType === 'generic-category-title') return 'category-titles';
  return 'general-presentation';
}

function percentage(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 10000) / 100;
}

function compareFindings(
  left: FoodPresentationAuditFinding,
  right: FoodPresentationAuditFinding,
): number {
  return (
    SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
    left.issueType.localeCompare(right.issueType) ||
    left.displayName.localeCompare(right.displayName) ||
    left.canonicalName.localeCompare(right.canonicalName) ||
    left.foodId.localeCompare(right.foodId)
  );
}

export function auditFoodPresentationRecords(
  records: readonly FoodPresentationAuditRecord[],
  generatedAt = new Date().toISOString(),
): FoodPresentationQualityAuditReport {
  const resolved = records.map((record) => ({
    ...record,
    presentation: resolveFoodPresentation(record.name, record.presentation),
    segments: canonicalSegments(record.name),
  }));

  const duplicateGroups = new Map<
    string,
    typeof resolved
  >();
  for (const record of resolved) {
    const key = normalizeFoodSearchText(record.presentation.displayName);
    const group = duplicateGroups.get(key) ?? [];
    group.push(record);
    duplicateGroups.set(key, group);
  }

  const findings: FoodPresentationAuditFinding[] = [];
  const addFinding = (
    record: (typeof resolved)[number],
    issueType: FoodPresentationAuditIssueType,
    reason: string,
    relatedFoodIds?: readonly string[],
  ): void => {
    findings.push({
      issueType,
      severity: ISSUE_SEVERITY[issueType],
      foodId: record.id,
      canonicalName: record.name,
      displayName: record.presentation.displayName,
      variantLabel: record.presentation.variantLabel,
      reason,
      grammarRule: inferGrammarRule(record, issueType, reason),
      ...(relatedFoodIds == null ? {} : { relatedFoodIds }),
    });
  };

  for (const record of resolved) {
    const genericTitle = isGenericPrimaryTitle(record.presentation.displayName);
    const promotableConcept = hasPromotableFoodConcept(record.segments);

    if (genericTitle && promotableConcept) {
      addFinding(
        record,
        'incorrect-primary-concept',
        'The primary food concept appears to be in the canonical descriptors rather than the display name; consider promoting the specific food concept.',
      );
    }

    if (genericTitle && record.segments.length > 1) {
      addFinding(
        record,
        'generic-category-title',
        `Display name “${record.presentation.displayName}” is a broad category while the canonical name contains additional food descriptors.`,
      );
    }

    const brandReason = findBrandUsedAsTitle(
      record.segments,
      record.presentation.displayName,
    );
    if (brandReason) addFinding(record, 'brand-used-as-title', brandReason);

    const grammarReason = findGrammarIssue(record.presentation.displayName);
    if (grammarReason) {
      addFinding(record, 'grammar-or-pluralization', grammarReason);
    }

    const variantReason = findVariantIssue(
      record.presentation.displayName,
      record.presentation.variantLabel,
    );
    if (variantReason) {
      addFinding(record, 'empty-or-redundant-variant', variantReason);
    }
  }

  const duplicateDisplayNameGroups = [...duplicateGroups.entries()]
    .flatMap(([normalizedDisplayName, displayGroup]) => {
      const recordsByVariant = new Map<string, typeof resolved>();
      for (const record of displayGroup) {
        const key = variantDistinctionKey(record.presentation.variantLabel);
        const variantGroup = recordsByVariant.get(key) ?? [];
        variantGroup.push(record);
        recordsByVariant.set(key, variantGroup);
      }

      return [...recordsByVariant.entries()]
        .filter(([, variantGroup]) => variantGroup.length > 1)
        .map(([variantKey, variantGroup]) => ({
          normalizedDisplayName,
          variantKey,
          group: variantGroup,
        }));
    })
    .map(({ normalizedDisplayName, variantKey: _variantKey, group }) => {
      const sortedGroup = [...group].sort(
        (left, right) =>
          left.presentation.variantLabel?.localeCompare(
            right.presentation.variantLabel ?? '',
          ) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
      );
      return {
        displayName: sortedGroup[0]!.presentation.displayName,
        normalizedDisplayName,
        count: sortedGroup.length,
        foods: sortedGroup.map((record) => ({
          id: record.id,
          canonicalName: record.name,
          variantLabel: record.presentation.variantLabel,
        })),
      };
    })
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.displayName.localeCompare(right.displayName),
    );

  for (const group of duplicateDisplayNameGroups) {
    const relatedFoodIds = group.foods.map((food) => food.id);
    for (const food of group.foods) {
      const record = resolved.find((candidate) => candidate.id === food.id)!;
      addFinding(
        record,
        'duplicate-display-name',
        `Display name “${group.displayName}” is shared by ${group.count} foods; review whether the variants distinguish them sufficiently.`,
        relatedFoodIds,
      );
    }
  }

  const issuesByGrammarRule = [...
    findings.reduce((groups, finding) => {
      const group = groups.get(finding.grammarRule) ?? [];
      group.push(finding);
      groups.set(finding.grammarRule, group);
      return groups;
    }, new Map<FoodPresentationGrammarRule, FoodPresentationAuditFinding[]>()).entries(),
  ]
    .map(([grammarRule, group]) => ({
      grammarRule,
      description: GRAMMAR_RULE_DESCRIPTIONS[grammarRule],
      issueCount: group.length,
      foodCount: new Set(group.map((finding) => finding.foodId)).size,
      issueTypes: [...new Set(group.map((finding) => finding.issueType))].sort(),
      findings: group.sort(compareFindings),
    }))
    .sort(
      (left, right) =>
        right.issueCount - left.issueCount ||
        left.grammarRule.localeCompare(right.grammarRule),
    );

  const issueCounts = Object.fromEntries(
    (
      [
        'incorrect-primary-concept',
        'generic-category-title',
        'brand-used-as-title',
        'grammar-or-pluralization',
        'duplicate-display-name',
        'empty-or-redundant-variant',
      ] as const
    ).map((issueType) => [
      issueType,
      findings.filter((finding) => finding.issueType === issueType).length,
    ]),
  ) as Record<FoodPresentationAuditIssueType, number>;

  const foodsWithIssues = new Set(findings.map((finding) => finding.foodId));
  const reviewBySeverity = {
    HIGH: findings.filter((finding) => finding.severity === 'HIGH').sort(compareFindings),
    MEDIUM: findings.filter((finding) => finding.severity === 'MEDIUM').sort(compareFindings),
    LOW: findings.filter((finding) => finding.severity === 'LOW').sort(compareFindings),
  } as const;

  const confidence = {
    high: resolved.filter(
      (record) => !findings.some((finding) => finding.foodId === record.id),
    ).length,
    medium: resolved.filter((record) =>
      findings.some(
        (finding) =>
          finding.foodId === record.id && finding.severity === 'MEDIUM',
      ) &&
      !findings.some(
        (finding) =>
          finding.foodId === record.id && finding.severity === 'HIGH',
      ),
    ).length,
    low: resolved.filter((record) =>
      findings.some(
        (finding) =>
          finding.foodId === record.id && finding.severity === 'HIGH',
      ),
    ).length,
  };

  return {
    report: 'food-presentation-quality',
    generatedAt,
    readOnly: true,
    summary: {
      totalFoods: records.length,
      foodsWithIssues: foodsWithIssues.size,
      issueCounts,
      needsManualReview: foodsWithIssues.size,
      needsManualReviewPercentage: percentage(foodsWithIssues.size, records.length),
      confidence,
    },
    reviewBySeverity,
    duplicateDisplayNameGroups,
    issuesByGrammarRule,
  };
}
