import { Decimal } from 'decimal.js';
import { NutritionInsightSource } from '../sources/nutrition-insight.source.js';
import { NutritionTargets } from '../types/nutrition-targets.type.js';
import { NutritionTotal } from '../types/nutrition-total.type.js';

export class NutritionInsightEngine {
  evaluate(
    totals: readonly NutritionTotal[],
    targets: NutritionTargets,
  ): NutritionInsightSource[] {
    const insights: NutritionInsightSource[] = [];
    const sodiumInsight = this.evaluateSodium(totals, targets.sodiumMilligrams);
    if (sodiumInsight) insights.push(sodiumInsight);
    const proteinInsight = this.evaluateProtein(totals, targets.proteinGrams);
    if (proteinInsight) insights.push(proteinInsight);
    return insights;
  }

  private evaluateSodium(
    totals: readonly NutritionTotal[],
    targetValue: string,
  ): NutritionInsightSource | null {
    const sodium = this.findTotal(totals, 'sodium', 'mg');
    if (!sodium) return null;
    const measured = new Decimal(sodium.amount);
    const target = new Decimal(targetValue);
    if (!measured.gt(target)) return null;
    return {
      ruleId: 'sodium-daily-threshold',
      severity: 'warning',
      measuredValue: measured.toString(),
      targetValue: target.toString(),
      explanation: `Sodium intake was ${measured.toString()} mg, above the daily threshold of ${target.toString()} mg.`,
    };
  }

  private evaluateProtein(
    totals: readonly NutritionTotal[],
    targetValue: string | null,
  ): NutritionInsightSource | null {
    if (targetValue == null) return null;
    const protein = this.findTotal(totals, 'protein', 'g');
    if (!protein) return null;
    const target = new Decimal(targetValue);
    const measured = new Decimal(protein.amount);
    if (!measured.lt(target)) return null;
    return {
      ruleId: 'protein-below-weight-target',
      severity: 'warning',
      measuredValue: measured.toString(),
      targetValue: target.toString(),
      explanation: `Protein intake was ${measured.toString()} g, below the estimated daily target of ${target.toString()} g based on body weight.`,
    };
  }

  private findTotal(
    totals: readonly NutritionTotal[],
    name: string,
    unit: string,
  ): NutritionTotal | undefined {
    return totals.find(
      (total) =>
        total.name.trim().toLowerCase() === name &&
        total.unit.trim().toLowerCase() === unit,
    );
  }
}
