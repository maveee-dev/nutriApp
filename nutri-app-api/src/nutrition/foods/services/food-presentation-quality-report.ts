import type {
  FoodPresentationAuditFinding,
  FoodPresentationAuditIssueType,
  FoodPresentationGrammarRuleGroup,
  FoodPresentationQualityAuditReport,
} from './food-presentation-quality-audit.js';

const ISSUE_LABELS: Readonly<Record<FoodPresentationAuditIssueType, string>> = {
  'incorrect-primary-concept': 'Incorrect primary concept',
  'generic-category-title': 'Generic category title',
  'brand-used-as-title': 'Brand used as title',
  'grammar-or-pluralization': 'Grammar / pluralization issue',
  'duplicate-display-name': 'Ambiguous duplicate display name',
  'empty-or-redundant-variant': 'Empty or redundant variant label',
};

const RULE_SUGGESTIONS: Readonly<Record<string, string>> = {
  'cheese-types': 'Add reusable cheese-type grammar that promotes American, Swiss, cheese-food, and related product descriptors.',
  'meat-cuts': 'Extend generic meat-cut grammar for species, cuts, grades, and preparations such as tenderloin, breast, chop, and roast.',
  'fish-species': 'Extend fish and seafood grammar to promote species, product type, and preparation while keeping oils and species distinct.',
  beverages: 'Add beverage grammar that promotes the drink product or type and keeps beverage category and brand as secondary context.',
  'nuts-and-seeds': 'Promote nut, seed, and nut-product descriptors such as almond, walnut, acorn, and almond butter.',
  'mixed-dishes': 'Extract dish concepts such as pizza, sandwich, soup, salad, and pasta from category and preparation segments.',
  'ethnic-foods': 'Keep the recognizable dish as the display name and use cuisine or cultural descriptors as variants.',
  'branded-foods': 'Use generic brand-leading grammar to promote the product and retain the brand in the variant label, with product-brand exceptions.',
  'prepared-meals': 'Add reusable prepared-meal grammar for restaurant, frozen, baby-food, menu, and ready-to-eat records.',
  'compound-foods': 'Extend inverted compound grammar such as “Bread, X” → “X Bread” across food types.',
  pluralization: 'Improve general singularization and plural normalization rather than adding food-specific spelling rules.',
  'variant-labels': 'Normalize and deduplicate variant descriptors before exposing them to users.',
  'duplicate-display-names': 'Improve display-plus-variant distinction for foods that remain indistinguishable to users.',
  'category-titles': 'Avoid broad USDA categories as primary names when a specific food concept is available.',
  'general-presentation': 'Review the canonical-to-presentation rule coverage and add a reusable grammar rule only when the pattern recurs.',
};

function percentage(count: number, total: number): string {
  return `${total === 0 ? '0.00' : ((count / total) * 100).toFixed(2)}%`;
}

function variantText(variantLabel: string | null): string {
  return variantLabel == null || variantLabel.trim() === ''
    ? '(none)'
    : variantLabel;
}

function renderFinding(finding: FoodPresentationAuditFinding): string {
  return [
    `- Food ID: ${finding.foodId}`,
    `  Canonical: ${JSON.stringify(finding.canonicalName)}`,
    `  Display: ${JSON.stringify(finding.displayName)}`,
    `  Variant: ${JSON.stringify(variantText(finding.variantLabel))}`,
    `  Issue: ${ISSUE_LABELS[finding.issueType]}`,
    `  Reason: ${finding.reason}`,
  ].join('\n');
}

function priorityGroups(
  groups: readonly FoodPresentationGrammarRuleGroup[],
): readonly FoodPresentationGrammarRuleGroup[] {
  return [...groups]
    .sort((left, right) => {
      const leftHigh = left.findings.filter((finding) => finding.severity === 'HIGH').length;
      const rightHigh = right.findings.filter((finding) => finding.severity === 'HIGH').length;
      return (
        rightHigh - leftHigh ||
        right.issueCount - left.issueCount ||
        left.grammarRule.localeCompare(right.grammarRule)
      );
    })
    .slice(0, 10);
}

function renderGrammarGroups(
  groups: readonly FoodPresentationGrammarRuleGroup[],
): string {
  if (groups.length === 0) return 'None.\n';

  return groups
    .map((group) => {
      const findings = group.findings.map(renderFinding).join('\n');
      return [
        `### ${group.grammarRule}`,
        group.description,
        `Issues: ${group.issueCount}; foods: ${group.foodCount}`,
        findings || 'No detailed findings.',
      ].join('\n');
    })
    .join('\n\n');
}

function renderDuplicateGroups(
  report: FoodPresentationQualityAuditReport,
): string {
  if (report.duplicateDisplayNameGroups.length === 0) return 'None.\n';

  return report.duplicateDisplayNameGroups
    .map((group) => {
      const foods = group.foods
        .map(
          (food) =>
            `- ${food.id}: ${JSON.stringify(food.canonicalName)} | variant: ${JSON.stringify(variantText(food.variantLabel))}`,
        )
        .join('\n');
      return [
        `- Display: ${JSON.stringify(group.displayName)}`,
        `  Count: ${group.count}`,
        foods,
      ].join('\n');
    })
    .join('\n');
}

export function formatFoodPresentationQualityReport(
  report: FoodPresentationQualityAuditReport,
): string {
  const { summary } = report;
  const issueCounts = Object.entries(summary.issueCounts)
    .map(
      ([issueType, count]) =>
        `${ISSUE_LABELS[issueType as FoodPresentationAuditIssueType].padEnd(38, '.')} ${count.toString().padStart(6)} (${percentage(count, summary.totalFoods)})`,
    )
    .join('\n');
  const topPriorities = priorityGroups(report.issuesByGrammarRule)
    .map((group, index) => {
      const highCount = group.findings.filter((finding) => finding.severity === 'HIGH').length;
      return `${index + 1}. ${group.grammarRule} — ${highCount} high-severity, ${group.issueCount} total issues`;
    })
    .join('\n');
  const confidence = [
    `High confidence: ${summary.confidence.high} (${percentage(summary.confidence.high, summary.totalFoods)})`,
    `Medium confidence: ${summary.confidence.medium} (${percentage(summary.confidence.medium, summary.totalFoods)})`,
    `Low confidence: ${summary.confidence.low} (${percentage(summary.confidence.low, summary.totalFoods)})`,
  ].join('\n');
  const suggestions = report.issuesByGrammarRule
    .map(
      (group) =>
        `- ${group.grammarRule}: ${RULE_SUGGESTIONS[group.grammarRule] ?? group.description}`,
    )
    .join('\n');

  return [
    'NutriApp Food Presentation Quality Audit',
    '=========================================',
    `Generated: ${report.generatedAt}`,
    'Read-only: yes',
    '',
    'Summary',
    '-------',
    `Total foods: ${summary.totalFoods}`,
    `Foods with issues: ${summary.foodsWithIssues}`,
    `Needs manual review: ${summary.needsManualReview} (${summary.needsManualReviewPercentage.toFixed(2)}%)`,
    'Presentation quality score: not defined; confidence distribution is reported below.',
    '',
    'Confidence distribution',
    '------------------------',
    confidence,
    '',
    'Issue counts by category',
    '-------------------------',
    issueCounts,
    '',
    'Top priorities',
    '--------------',
    topPriorities || 'None.',
    '',
    'Findings grouped by grammar category',
    '-------------------------------------',
    renderGrammarGroups(report.issuesByGrammarRule),
    '',
    'Ambiguous duplicate display names',
    '---------------------------------',
    renderDuplicateGroups(report),
    '',
    'Suggested reusable grammar improvements',
    '----------------------------------------',
    suggestions || 'None.',
    '',
  ].join('\n');
}
