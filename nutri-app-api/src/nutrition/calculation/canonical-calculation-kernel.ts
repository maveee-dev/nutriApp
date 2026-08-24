import { Decimal } from 'decimal.js';
import {
  CalculationDecimal,
  CalculationDiagnostics,
  CompositionCalculationInput,
  NutrientCalculationInput,
  NutrientCalculationResult,
  NutrientContribution,
  NutrientKey,
  NutrientUnit,
  NutrientUnitConflict,
  ServingScalingInput,
} from './types/canonical-calculation.types.js';

const HUNDRED_GRAMS = new Decimal(100);

/**
 * Pure, policy-independent nutrition arithmetic.
 *
 * The kernel accepts already-resolved nutrient rows and serving quantities. It
 * does not load foods, interpret units, resolve targets, round for display, or
 * make clinical decisions. Callers own those concerns and may adapt their
 * existing domain models to these small input types.
 */
export class CanonicalCalculationKernel {
  /**
   * Converts a serving quantity to grams without rounding.
   *
   * Zero is retained as a valid mathematical quantity. Negative or non-finite
   * quantities are rejected because they cannot represent a food portion.
   */
  servingToGrams(input: ServingScalingInput): CalculationDecimal {
    const servingGrams = this.toNonNegativeDecimal(input.servingGrams, 'servingGrams');
    const quantity = this.toNonNegativeDecimal(input.quantity ?? '1', 'quantity');
    return servingGrams.mul(quantity).toString();
  }

  /**
   * Scales all supplied nutrient rows for one composition item.
   *
   * USDA-style values are expressed per 100 grams, so each present value is
   * multiplied by total grams and divided by 100. Missing rows are omitted,
   * reported in diagnostics, and never converted to zero. A reported zero is
   * preserved as a real zero contribution.
   */
  calculateNutrients(input: NutrientCalculationInput): NutrientCalculationResult {
    const servingGrams = this.toNonNegativeDecimal(input.servingGrams, 'servingGrams');
    const quantity = this.toNonNegativeDecimal(input.quantity ?? '1', 'quantity');
    const missingNutrientKeys = new Set<string>();
    const contributions: NutrientContribution[] = [];

    for (const expectedKey of input.expectedNutrientKeys ?? []) {
      if (!input.nutrients.some((nutrient) => this.sameKey(nutrient.nutrientKey, expectedKey))) {
        missingNutrientKeys.add(expectedKey);
      }
    }

    for (const nutrient of input.nutrients) {
      if (nutrient.amountPer100Grams == null) {
        missingNutrientKeys.add(nutrient.nutrientKey);
        continue;
      }

      contributions.push({
        nutrientKey: nutrient.nutrientKey,
        name: nutrient.name,
        unit: nutrient.unit,
        amount: new Decimal(nutrient.amountPer100Grams)
          .mul(servingGrams)
          .mul(quantity)
          .div(HUNDRED_GRAMS)
          .toString(),
      });
    }

    return {
      contributions,
      diagnostics: this.diagnostics(missingNutrientKeys, this.findUnitConflicts(contributions)),
    };
  }

  /**
   * Aggregates already calculated contributions without interpreting their
   * nutrients or units. Contributions with the same key and unit are added;
   * different units remain separate so the kernel cannot silently mix them.
   */
  aggregateContributions(
    contributions: readonly NutrientContribution[],
    expectedNutrientKeys: readonly NutrientKey[] = [],
    aggregationOrder: 'deterministic' | 'input' = 'deterministic',
  ): NutrientCalculationResult {
    const totals = new Map<string, NutrientContribution>();
    const missingNutrientKeys = new Set<string>();

    for (const expectedKey of expectedNutrientKeys) {
      if (!contributions.some((contribution) => this.sameKey(contribution.nutrientKey, expectedKey))) {
        missingNutrientKeys.add(expectedKey);
      }
    }

    for (const contribution of contributions) {
      const key = this.contributionKey(contribution.nutrientKey, contribution.unit);
      const existing = totals.get(key);
      if (existing == null) {
        totals.set(key, contribution);
        continue;
      }

      totals.set(key, {
        ...existing,
        amount: new Decimal(existing.amount).plus(contribution.amount).toString(),
      });
    }

    const sorted = [...totals.values()];
    if (aggregationOrder === 'deterministic') {
      sorted.sort((left, right) => {
        const byName = this.compareText(left.name, right.name);
        if (byName !== 0) return byName;
        const byUnit = this.compareText(left.unit, right.unit);
        if (byUnit !== 0) return byUnit;
        return this.compareText(left.nutrientKey, right.nutrientKey);
      });
    }

    return {
      contributions: sorted,
      diagnostics: this.diagnostics(missingNutrientKeys, this.findUnitConflicts(sorted)),
    };
  }

  /** Calculates and aggregates an arbitrary collection of composition items. */
  calculateComposition(input: CompositionCalculationInput): NutrientCalculationResult {
    const contributions: NutrientContribution[] = [];
    const missingNutrientKeys = new Set<string>(input.expectedNutrientKeys ?? []);
    const unitConflicts: NutrientUnitConflict[] = [];

    for (const item of input.items) {
      const result = this.calculateNutrients(item);
      contributions.push(...result.contributions);
      for (const key of result.diagnostics.missingNutrientKeys) {
        missingNutrientKeys.add(key);
      }
      unitConflicts.push(...result.diagnostics.unitConflicts);
    }

    const aggregate = this.aggregateContributions(
      contributions,
      input.expectedNutrientKeys,
      input.aggregationOrder,
    );
    return {
      contributions: aggregate.contributions,
      diagnostics: this.diagnostics(
        missingNutrientKeys,
        this.mergeUnitConflicts([...unitConflicts, ...aggregate.diagnostics.unitConflicts]),
      ),
    };
  }

  private diagnostics(
    missingNutrientKeys: Iterable<NutrientKey>,
    unitConflicts: readonly NutrientUnitConflict[],
  ): CalculationDiagnostics {
    return {
      missingNutrientKeys: [...new Set([...missingNutrientKeys])].sort(this.compareText),
      unitConflicts: this.mergeUnitConflicts(unitConflicts),
    };
  }

  private findUnitConflicts(contributions: readonly NutrientContribution[]): NutrientUnitConflict[] {
    const unitsByNutrient = new Map<string, Map<string, NutrientUnit>>();
    for (const contribution of contributions) {
      const nutrientKey = this.normalizedKey(contribution.nutrientKey);
      const units = unitsByNutrient.get(nutrientKey) ?? new Map<string, NutrientUnit>();
      units.set(this.normalizedUnit(contribution.unit), contribution.unit);
      unitsByNutrient.set(nutrientKey, units);
    }

    return [...unitsByNutrient.entries()]
      .filter(([, units]) => units.size > 1)
      .map(([nutrientKey, units]) => ({
        nutrientKey,
        units: [...units.values()].sort(this.compareText),
      }));
  }

  private mergeUnitConflicts(conflicts: readonly NutrientUnitConflict[]): NutrientUnitConflict[] {
    const merged = new Map<string, Set<string>>();
    for (const conflict of conflicts) {
      const units = merged.get(conflict.nutrientKey) ?? new Set<string>();
      for (const unit of conflict.units) units.add(unit);
      merged.set(conflict.nutrientKey, units);
    }
    return [...merged.entries()]
      .sort(([left], [right]) => this.compareText(left, right))
      .map(([nutrientKey, units]) => ({
        nutrientKey,
        units: [...units].sort(this.compareText),
      }));
  }

  private contributionKey(nutrientKey: NutrientKey, unit: NutrientUnit): string {
    return `${this.normalizedKey(nutrientKey)}|${this.normalizedUnit(unit)}`;
  }

  private sameKey(left: NutrientKey, right: NutrientKey): boolean {
    return this.normalizedKey(left) === this.normalizedKey(right);
  }

  private normalizedKey(value: string): string {
    return value.trim().toLowerCase();
  }

  private normalizedUnit(value: string): string {
    return value.trim().toLowerCase();
  }

  private toNonNegativeDecimal(value: CalculationDecimal, label: string): Decimal {
    const decimal = new Decimal(value);
    if (!decimal.isFinite() || decimal.isNegative()) {
      throw new RangeError(`${label} must be a finite, non-negative decimal.`);
    }
    return decimal;
  }

  private compareText(left: string, right: string): number {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }
}
