import type { FoodSummarySource } from '../sources/food-summary.source.js';
import {
  isModifierOnlyDisplayNameMatch,
  isPrimaryConceptDisplayNameMatch,
  isSpecificFoodVariantQuery,
  normalizeFoodSearchText,
} from './food-presentation.service.js';
import { rankFoodSearchResults } from './food-search-ranker.js';

export const DEFAULT_FOOD_SEARCH_AUDIT_QUERIES = [
  'egg',
  'chicken',
  'beef',
  'pork',
  'fish',
  'rice',
  'bread',
  'milk',
  'cheese',
  'yogurt',
  'coffee',
  'tea',
  'juice',
  'apple',
  'banana',
  'tomato',
  'potato',
  'beans',
  'shrimp',
  'salmon',
] as const;

const COMMON_CATEGORY_QUERY_TERMS = [
  'beverage',
  'cereal',
  'dairy',
  'egg',
  'fish',
  'fruit',
  'legume',
  'meat',
  'nut',
  'oil',
  'poultry',
  'seafood',
  'snack',
  'soup',
  'sweet',
  'vegetable',
] as const;

const GENERIC_DISPLAY_TITLES = new Set([
  'beef',
  'bread',
  'candy',
  'cereal',
  'cheese',
  'chicken',
  'fish',
  'food',
  'fruit',
  'milk',
  'nut',
  'pork',
  'potato',
  'rice',
  'seafood',
  'tomato',
  'vegetable',
  'yogurt',
]);

const TECHNICAL_MARKERS = [
  'by-product',
  'composite',
  'concentrate',
  'hydrolyzed',
  'industrial',
  'ingredient',
  'laboratory',
  'reference',
  'separable',
  'technical',
  'trimmed retail cuts',
  'waste',
] as const;

const COMMON_BRAND_MARKERS = [
  'applebee',
  'burger king',
  'campbell',
  'coca cola',
  'domino',
  'healthy choice',
  'kfc',
  'mcdonald',
  'oreo',
  'pepsi',
  'quaker',
  'starbucks',
  'wendy',
] as const;

export type FoodSearchAuditIssue =
  | 'generic-title-ranked-high'
  | 'technical-food-ranked-high'
  | 'brand-dominates-generic-search'
  | 'compound-outranks-primary-concept'
  | 'duplicate-concept-cluster'
  | 'poor-result-diversity';

export interface FoodSearchMatchExplanation {
  readonly matchTier: number;
  readonly rankScore: number;
  readonly reason: string;
}

export interface FoodSearchAuditResult {
  readonly rank: number;
  readonly rankScore: number;
  readonly matchTier: number;
  readonly matchReason: string;
  readonly foodId: string;
  readonly displayName: string;
  readonly variantLabel: string | null;
  readonly canonicalName: string;
  readonly category: string;
  readonly flags: readonly FoodSearchAuditIssue[];
}

export interface FoodSearchDuplicateConcept {
  readonly displayName: string;
  readonly count: number;
  readonly ranks: readonly number[];
}

export interface FoodSearchDiversity {
  readonly resultCount: number;
  readonly distinctDisplayNames: number;
  readonly distinctRatio: number;
}

export interface FoodSearchQueryAudit {
  readonly query: string;
  readonly matchedCandidateCount: number;
  readonly results: readonly FoodSearchAuditResult[];
  readonly duplicateConcepts: readonly FoodSearchDuplicateConcept[];
  readonly diversity: FoodSearchDiversity;
  readonly issues: readonly FoodSearchAuditIssue[];
  readonly observations: readonly string[];
}

export interface FoodSearchCategoryCoverage {
  readonly category: string;
  readonly query: string;
  readonly matchedCandidateCount: number;
  readonly topDisplayNames: readonly string[];
}

export interface FoodSearchQualityAuditReport {
  readonly report: 'food-search-quality';
  readonly generatedAt: string;
  readonly readOnly: true;
  readonly queryCount: number;
  readonly summary: {
    readonly totalFoods: number;
    readonly totalMatchedCandidates: number;
    readonly queriesWithIssues: number;
    readonly issueCounts: Readonly<Record<FoodSearchAuditIssue, number>>;
    readonly averageTopTenDistinctRatio: number;
  };
  readonly overallObservations: readonly string[];
  readonly recommendedImprovements: readonly {
    readonly priority: 'High' | 'Medium' | 'Low';
    readonly improvement: string;
    readonly estimatedImpact: string;
  }[];
  readonly categoryCoverage: readonly FoodSearchCategoryCoverage[];
  readonly queries: readonly FoodSearchQueryAudit[];
}

function startsWithToken(value: string, query: string): boolean {
  return value.split(' ').some((token) => token.startsWith(query));
}

function normalizedAliases(food: FoodSummarySource): readonly string[] {
  return (food.searchAliases ?? []).map(normalizeFoodSearchText);
}

function isTechnicalFood(food: FoodSummarySource): boolean {
  const searchable = normalizeFoodSearchText(
    [food.name, food.variantLabel ?? '', food.description ?? ''].join(' '),
  );
  return TECHNICAL_MARKERS.some((marker) =>
    searchable.includes(normalizeFoodSearchText(marker)),
  );
}

function isLikelyBrandedFood(food: FoodSummarySource): boolean {
  const canonical = food.name.trim();
  const firstSegment = canonical.split(',')[0]?.trim() ?? '';
  const normalizedFirst = normalizeFoodSearchText(firstSegment);
  const normalizedVariant = normalizeFoodSearchText(food.variantLabel ?? '');
  return (
    COMMON_BRAND_MARKERS.some((marker) =>
      `${normalizedFirst} ${normalizedVariant}`.includes(
        normalizeFoodSearchText(marker),
      ),
    ) ||
    /(?:['’]s|\b[A-Z]{2,})/.test(firstSegment)
  );
}

function applySpecialtyDemotion(
  food: FoodSummarySource,
  query: string,
  tier: number,
): { tier: number; reason: string | null } {
  if (
    (food.searchPriority ?? 0) < 0 &&
    !isSpecificFoodVariantQuery(query) &&
    tier <= 6
  ) {
    return { tier: 7, reason: 'specialty-variant demotion' };
  }
  return { tier, reason: null };
}

function describeMatch(
  food: FoodSummarySource,
  query: string,
): FoodSearchMatchExplanation {
  const normalizedQuery = normalizeFoodSearchText(query);
  const displayName = normalizeFoodSearchText(food.displayName ?? food.name);
  const canonicalName = normalizeFoodSearchText(food.name);
  const aliases = normalizedAliases(food);
  let tier: number;
  let reason: string;

  if (displayName === normalizedQuery) {
    tier = 1;
    reason = 'exact display-name match';
  } else if (aliases.some((alias) => alias === normalizedQuery)) {
    tier = 2;
    reason = 'exact alias match';
  } else if (displayName.startsWith(normalizedQuery)) {
    tier = 3;
    reason = isModifierOnlyDisplayNameMatch(displayName, normalizedQuery)
      ? 'display-name prefix; modifier-only compound demotion'
      : 'display-name prefix match';
    if (isModifierOnlyDisplayNameMatch(displayName, normalizedQuery)) tier = 6;
  } else if (aliases.some((alias) => alias.startsWith(normalizedQuery))) {
    tier = 4;
    reason = 'alias prefix match';
  } else if (isPrimaryConceptDisplayNameMatch(displayName, normalizedQuery)) {
    tier = 4;
    reason = 'primary-concept display-name match';
  } else if (canonicalName.startsWith(normalizedQuery)) {
    tier = 5;
    reason = 'canonical-name prefix match';
  } else if (
    startsWithToken(displayName, normalizedQuery) ||
    aliases.some((alias) => startsWithToken(alias, normalizedQuery))
  ) {
    tier = 6;
    reason = 'display-name or alias token match';
  } else if (canonicalName.includes(normalizedQuery)) {
    tier = 7;
    reason = 'canonical-name contains query';
  } else if (normalizeFoodSearchText(food.description ?? '').includes(normalizedQuery)) {
    tier = 8;
    reason = 'description contains query';
  } else {
    tier = 9;
    reason = 'no search-field match';
  }

  const specialty = applySpecialtyDemotion(food, normalizedQuery, tier);
  if (specialty.reason) reason = `${reason}; ${specialty.reason}`;
  tier = specialty.tier;

  return {
    matchTier: tier,
    rankScore: Math.max(0, 100 - (tier - 1) * 10),
    reason,
  };
}

function issueFlagsForResult(
  food: FoodSummarySource,
  query: string,
  rank: number,
): FoodSearchAuditIssue[] {
  const displayName = normalizeFoodSearchText(food.displayName ?? food.name);
  const normalizedQuery = normalizeFoodSearchText(query);
  const flags: FoodSearchAuditIssue[] = [];

  if (rank <= 3 && GENERIC_DISPLAY_TITLES.has(displayName)) {
    flags.push('generic-title-ranked-high');
  }
  if (rank <= 3 && isTechnicalFood(food)) {
    flags.push('technical-food-ranked-high');
  }
  if (rank <= 3 && isLikelyBrandedFood(food) && !displayName.includes(normalizedQuery)) {
    flags.push('brand-dominates-generic-search');
  }
  return flags;
}

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}

function categoryQueries(categories: readonly string[]): readonly { category: string; query: string }[] {
  const seen = new Set<string>();
  const result: { category: string; query: string }[] = [];
  for (const category of categories) {
    const normalized = normalizeFoodSearchText(category);
    const query = COMMON_CATEGORY_QUERY_TERMS.find((term) => normalized.includes(term));
    if (!query || seen.has(query)) continue;
    seen.add(query);
    result.push({ category, query });
  }
  return result;
}

export function auditFoodSearchQuality(
  foods: readonly FoodSummarySource[],
  categories: readonly string[] = [],
  generatedAt = new Date().toISOString(),
): FoodSearchQualityAuditReport {
  const queries = [...DEFAULT_FOOD_SEARCH_AUDIT_QUERIES];
  const queryReports: FoodSearchQueryAudit[] = [];
  const issueCounts: Record<FoodSearchAuditIssue, number> = {
    'generic-title-ranked-high': 0,
    'technical-food-ranked-high': 0,
    'brand-dominates-generic-search': 0,
    'compound-outranks-primary-concept': 0,
    'duplicate-concept-cluster': 0,
    'poor-result-diversity': 0,
  };

  for (const query of queries) {
    const ranked = rankFoodSearchResults(foods, query);
    const matched = ranked.filter((food) => describeMatch(food, query).matchTier < 9);
    const top = matched.slice(0, 10);
    const results: FoodSearchAuditResult[] = top.map((food, index) => {
      const explanation = describeMatch(food, query);
      return {
        rank: index + 1,
        rankScore: explanation.rankScore,
        matchTier: explanation.matchTier,
        matchReason: explanation.reason,
        foodId: food.id,
        displayName: food.displayName ?? food.name,
        variantLabel: food.variantLabel ?? null,
        canonicalName: food.name,
        category: food.category.name,
        flags: issueFlagsForResult(food, query, index + 1),
      };
    });

    const duplicateMap = new Map<string, number[]>();
    for (const result of results) {
      const key = normalizeFoodSearchText(result.displayName);
      const ranks = duplicateMap.get(key) ?? [];
      ranks.push(result.rank);
      duplicateMap.set(key, ranks);
    }
    const duplicateConcepts = [...duplicateMap.entries()]
      .filter(([, ranks]) => ranks.length > 1)
      .map(([displayName, ranks]) => ({ displayName, count: ranks.length, ranks }));

    const distinctDisplayNames = new Set(
      results.map((result) => normalizeFoodSearchText(result.displayName)),
    ).size;
    const diversity: FoodSearchDiversity = {
      resultCount: results.length,
      distinctDisplayNames,
      distinctRatio: roundRatio(
        results.length === 0 ? 0 : distinctDisplayNames / results.length,
      ),
    };

    const issues = new Set<FoodSearchAuditIssue>();
    for (const result of results) {
      for (const flag of result.flags) issues.add(flag);
    }
    const compoundResultRanks = results
      .filter((result) =>
        isModifierOnlyDisplayNameMatch(
          normalizeFoodSearchText(result.displayName),
          normalizeFoodSearchText(query),
        ),
      )
      .map((result) => result.rank);
    const primaryResultRanks = results
      .filter(
        (result) =>
          !isModifierOnlyDisplayNameMatch(
            normalizeFoodSearchText(result.displayName),
            normalizeFoodSearchText(query),
          ),
      )
      .map((result) => result.rank);
    if (
      compoundResultRanks.some((rank) =>
        primaryResultRanks.some((primaryRank) => primaryRank > rank),
      )
    ) {
      issues.add('compound-outranks-primary-concept');
    }
    if (duplicateConcepts.length > 0) issues.add('duplicate-concept-cluster');
    if (results.length >= 5 && diversity.distinctRatio < 0.6) {
      issues.add('poor-result-diversity');
    }

    const observations: string[] = [];
    if (matched.length === 0) observations.push('No matching catalog candidates were found.');
    if (issues.has('technical-food-ranked-high')) {
      observations.push('Technical or industrial records appear in the first three results.');
    }
    if (issues.has('brand-dominates-generic-search')) {
      observations.push('A branded record appears high for a generic query.');
    }
    if (issues.has('compound-outranks-primary-concept')) {
      observations.push('A compound food appears ahead of a primary-concept result.');
    }
    if (issues.has('duplicate-concept-cluster')) {
      observations.push('The top results contain repeated display concepts with variants.');
    }
    if (issues.has('poor-result-diversity')) {
      observations.push('The top results have low display-name diversity.');
    }

    for (const issue of issues) issueCounts[issue] += 1;
    queryReports.push({
      query,
      matchedCandidateCount: matched.length,
      results,
      duplicateConcepts,
      diversity,
      issues: [...issues],
      observations,
    });
  }

  const categoryCoverage = categoryQueries(categories).map(({ category, query }) => {
    const ranked = rankFoodSearchResults(foods, query);
    const matched = ranked.filter((food) => describeMatch(food, query).matchTier < 9);
    return {
      category,
      query,
      matchedCandidateCount: matched.length,
      topDisplayNames: matched.slice(0, 10).map((food) => food.displayName ?? food.name),
    };
  });

  const averageTopTenDistinctRatio = roundRatio(
    queryReports.length === 0
      ? 0
      : queryReports.reduce((sum, report) => sum + report.diversity.distinctRatio, 0) /
          queryReports.length,
  );
  const queriesWithIssues = queryReports.filter((report) => report.issues.length > 0).length;
  const overallObservations = [
    `${queriesWithIssues} of ${queryReports.length} representative queries have at least one audit flag.`,
    `${issueCounts['technical-food-ranked-high']} queries place technical records in the first three results.`,
    `${issueCounts['duplicate-concept-cluster']} queries contain duplicate display concepts in the top ten.`,
    `Average top-ten display-name diversity is ${averageTopTenDistinctRatio}.`,
  ];
  const recommendedImprovements = [
    {
      priority: 'High' as const,
      improvement: 'Review technical-record penalties for generic searches while preserving explicit technical queries.',
      estimatedImpact: `${issueCounts['technical-food-ranked-high']} representative queries currently show this risk.` ,
    },
    {
      priority: 'Medium' as const,
      improvement: 'Consider deterministic duplicate-concept grouping or diversity limits after validating the affected queries.',
      estimatedImpact: `${issueCounts['duplicate-concept-cluster']} queries contain repeated concepts in the top ten.` ,
    },
    {
      priority: 'Medium' as const,
      improvement: 'Add curated aliases only for high-value concepts that users search differently from canonical names.',
      estimatedImpact: 'Improves recall without changing clinical data or presentation derivation.',
    },
    {
      priority: 'Low' as const,
      improvement: 'Review branded dominance only where a generic query lacks a strong primary-concept result.',
      estimatedImpact: `${issueCounts['brand-dominates-generic-search']} representative queries show brand-dominance risk.` ,
    },
  ];

  return {
    report: 'food-search-quality',
    generatedAt,
    readOnly: true,
    queryCount: queryReports.length,
    summary: {
      totalFoods: foods.length,
      totalMatchedCandidates: queryReports.reduce(
        (sum, report) => sum + report.matchedCandidateCount,
        0,
      ),
      queriesWithIssues,
      issueCounts,
      averageTopTenDistinctRatio,
    },
    overallObservations,
    recommendedImprovements,
    categoryCoverage,
    queries: queryReports,
  };
}

function renderResult(result: FoodSearchAuditResult): string[] {
  return [
    `  ${result.rank}. ${result.displayName}${result.variantLabel ? ` - ${result.variantLabel}` : ''}`,
    `     Rank score: ${result.rankScore} | match tier: ${result.matchTier}`,
    `     Why: ${result.matchReason}`,
    `     Canonical: ${result.canonicalName}`,
    `     Category: ${result.category}`,
    ...(result.flags.length > 0 ? [`     Flags: ${result.flags.join(', ')}`] : []),
  ];
}

export function formatFoodSearchQualityReport(
  report: FoodSearchQualityAuditReport,
): string {
  const lines = [
    'NutriApp Food Search Quality Audit',
    '==================================',
    `Generated: ${report.generatedAt}`,
    'Read-only: yes',
    '',
    'Summary',
    '-------',
    `Total foods: ${report.summary.totalFoods}`,
    `Representative queries: ${report.queryCount}`,
    `Queries with issues: ${report.summary.queriesWithIssues}`,
    `Average top-ten display diversity: ${report.summary.averageTopTenDistinctRatio}`,
    '',
    'Issue counts by query',
    '----------------------',
    ...Object.entries(report.summary.issueCounts).map(
      ([issue, count]) => `${issue.padEnd(42, '.')} ${count}`,
    ),
    '',
    'Overall observations',
    '--------------------',
    ...report.overallObservations.map((observation) => `- ${observation}`),
    '',
    'Recommended reusable improvements',
    '----------------------------------',
    ...report.recommendedImprovements.flatMap((item) => [
      `${item.priority}: ${item.improvement}`,
      `  Estimated impact: ${item.estimatedImpact}`,
    ]),
    '',
    'Category coverage',
    '-----------------',
  ];

  if (report.categoryCoverage.length === 0) {
    lines.push('No matching food-group categories were available for coverage generation.');
  } else {
    for (const coverage of report.categoryCoverage) {
      lines.push(
        `${coverage.category} -> query "${coverage.query}"; candidates: ${coverage.matchedCandidateCount}`,
        `  Top: ${coverage.topDisplayNames.join(' | ') || 'none'}`,
      );
    }
  }

  lines.push('', 'Per-query findings', '------------------');
  for (const query of report.queries) {
    lines.push(
      '',
      `Query: ${query.query}`,
      `Matched candidates: ${query.matchedCandidateCount}`,
      `Issues: ${query.issues.join(', ') || 'none'}`,
      `Diversity: ${query.diversity.distinctDisplayNames}/${query.diversity.resultCount} distinct (${query.diversity.distinctRatio})`,
    );
    if (query.observations.length > 0) {
      lines.push(...query.observations.map((observation) => `Observation: ${observation}`));
    }
    if (query.duplicateConcepts.length > 0) {
      lines.push(
        `Duplicate concepts: ${query.duplicateConcepts
          .map((duplicate) => `${duplicate.displayName} (${duplicate.count})`)
          .join('; ')}`,
      );
    }
    if (query.results.length === 0) lines.push('  No matching results.');
    for (const result of query.results) lines.push(...renderResult(result));
  }

  return `${lines.join('\n')}\n`;
}
