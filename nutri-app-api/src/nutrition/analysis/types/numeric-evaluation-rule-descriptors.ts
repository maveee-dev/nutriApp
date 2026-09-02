import type { NumericConstraintRuleDescriptor } from './evaluation-rule.type.js';

const allScopes = ['food', 'meal', 'daily'] as const;

/**
 * Shared projection semantics for the numeric targets already supported by
 * NutriApp. These descriptors contain no target values or policy decisions;
 * they only define how a resolved target may be projected downstream.
 */
export const NUTRITION_EVALUATION_RULE_DESCRIPTORS = {
  sodium: {
    family: 'numeric-constraint', kind: 'upper-limit', roles: ['compatibility', 'contribution', 'progress'],
    scopes: allScopes, measurementKey: 'sodium', unit: 'mg', weight: 40,
  },
  saturatedFat: {
    family: 'numeric-constraint', kind: 'upper-limit', roles: ['compatibility', 'contribution', 'progress'],
    scopes: allScopes, measurementKey: 'saturated-fat', unit: 'g', weight: 20,
  },
  addedSugar: {
    family: 'numeric-constraint', kind: 'upper-limit', roles: ['compatibility', 'contribution', 'progress'],
    scopes: allScopes, measurementKey: 'added-sugar', unit: 'g', weight: 15,
  },
  fiber: {
    family: 'numeric-constraint', kind: 'lower-target', roles: ['contribution', 'progress'],
    scopes: allScopes, measurementKey: 'fiber', unit: 'g', weight: 10,
  },
  protein: {
    family: 'numeric-constraint', kind: 'lower-target', roles: ['contribution', 'progress'],
    scopes: allScopes, measurementKey: 'protein', unit: 'g', weight: 30,
  },
  carbohydrates: {
    family: 'numeric-constraint', kind: 'lower-target', roles: ['contribution', 'progress'],
    scopes: allScopes, measurementKey: 'carbohydrates', unit: 'g', weight: 25,
  },
  potassium: {
    family: 'numeric-constraint', kind: 'upper-limit', roles: ['compatibility', 'contribution', 'progress'],
    scopes: allScopes, measurementKey: 'potassium', unit: 'mg', weight: 30,
  },
  phosphorus: {
    family: 'numeric-constraint', kind: 'upper-limit', roles: ['compatibility', 'contribution', 'progress'],
    scopes: allScopes, measurementKey: 'phosphorus', unit: 'mg', weight: 30,
  },
} as const satisfies Readonly<Record<string, NumericConstraintRuleDescriptor>>;
