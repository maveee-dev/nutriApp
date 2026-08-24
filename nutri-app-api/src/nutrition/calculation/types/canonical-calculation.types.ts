/**
 * Primitive values accepted and returned by the canonical calculation layer.
 *
 * Decimal values intentionally cross the boundary as strings. This keeps the
 * kernel independent of persistence and prevents callers from accidentally
 * reintroducing binary floating-point arithmetic.
 */
export type CalculationDecimal = string;

/** A caller-owned identity for a nutrient. The kernel does not interpret it. */
export type NutrientKey = string;

/** Units are opaque to the kernel and are preserved exactly in outputs. */
export type NutrientUnit = string;

export interface CanonicalNutrientInput {
  readonly nutrientKey: NutrientKey;
  readonly name: string;
  readonly unit: NutrientUnit;
  /** null/undefined means evidence is absent; numeric zero remains a value. */
  readonly amountPer100Grams: CalculationDecimal | null | undefined;
}

export interface ServingScalingInput {
  readonly servingGrams: CalculationDecimal;
  readonly quantity?: CalculationDecimal;
}

export interface NutrientCalculationInput extends ServingScalingInput {
  readonly nutrients: readonly CanonicalNutrientInput[];
  /** Expected keys let callers distinguish an absent row from a reported zero. */
  readonly expectedNutrientKeys?: readonly NutrientKey[];
}

export interface NutrientContribution {
  readonly nutrientKey: NutrientKey;
  readonly name: string;
  readonly unit: NutrientUnit;
  readonly amount: CalculationDecimal;
}

export interface NutrientUnitConflict {
  readonly nutrientKey: NutrientKey;
  readonly units: readonly NutrientUnit[];
}

export interface CalculationDiagnostics {
  readonly missingNutrientKeys: readonly NutrientKey[];
  readonly unitConflicts: readonly NutrientUnitConflict[];
}

export interface NutrientCalculationResult {
  readonly contributions: readonly NutrientContribution[];
  readonly diagnostics: CalculationDiagnostics;
}

export interface CompositionItemInput extends NutrientCalculationInput {
  readonly itemKey?: string;
}

export interface CompositionCalculationInput {
  readonly items: readonly CompositionItemInput[];
  readonly expectedNutrientKeys?: readonly NutrientKey[];
  /** Input order is available for adapters that must preserve a legacy API order. */
  readonly aggregationOrder?: 'deterministic' | 'input';
}
