import { Decimal } from 'decimal.js';
import { FoodEvaluationInput, FoodEvaluationReason, FoodEvaluationSource } from '../types/food-evaluation.type.js';
import { NutritionTotal } from '../../analysis/types/nutrition-total.type.js';

const MAX_SODIUM_PENALTY = 60;
const MAX_PROTEIN_BONUS = 20;

export class FoodEvaluationEngine {
  evaluate(input: FoodEvaluationInput): FoodEvaluationSource {
    const totals = this.toTotals(input);
    const reasons: FoodEvaluationReason[] = [];
    let score = 100;

    const sodium = this.findTotal(totals, 'sodium', 'mg');
    if (sodium) {
      const target = new Decimal(input.targets.sodiumMilligrams);
      const measured = new Decimal(sodium.amount);
      const utilization = target.isZero() ? new Decimal(1) : measured.div(target);
      const penalty = Math.min(MAX_SODIUM_PENALTY, utilization.mul(MAX_SODIUM_PENALTY).toNumber());
      score -= penalty;
      reasons.push({
        code: measured.gt(target) ? 'sodium-above-target' : 'sodium-contribution',
        direction: measured.gt(target) ? 'negative' : 'neutral',
        nutrient: 'sodium',
        measuredValue: measured.toString(),
        targetValue: target.toString(),
        explanation: measured.gt(target)
          ? `This portion provides ${measured.toString()} mg of sodium, above the current daily limit of ${target.toString()} mg.`
          : `This portion provides ${measured.toString()} mg of sodium against the current daily limit of ${target.toString()} mg.`,
      });
    }

    const protein = this.findTotal(totals, 'protein', 'g');
    if (protein && input.targets.proteinGrams != null) {
      const target = new Decimal(input.targets.proteinGrams);
      const measured = new Decimal(protein.amount);
      const bonus = target.isZero() ? 0 : Math.min(MAX_PROTEIN_BONUS, measured.div(target).mul(MAX_PROTEIN_BONUS).toNumber());
      score += bonus;
      reasons.push({
        code: 'protein-contribution',
        direction: 'positive',
        nutrient: 'protein',
        measuredValue: measured.toString(),
        targetValue: target.toString(),
        explanation: `This portion provides ${measured.toString()} g of protein toward the current daily target of ${target.toString()} g.`,
      });
    }

    return {
      score: Math.round(Math.max(0, Math.min(100, score))),
      reasons,
      deferredPolicies: input.targetCalculation.deferredPolicies,
    };
  }

  private toTotals(input: FoodEvaluationInput): NutritionTotal[] {
    const totals = new Map<string, Decimal>();
    for (const nutrient of input.nutrients) {
      const key = `${nutrient.name.trim().toLowerCase()}|${nutrient.unit.trim().toLowerCase()}`;
      const amount = new Decimal(nutrient.amountPer100Grams).mul(input.portionGrams).div(100);
      const existing = totals.get(key);
      totals.set(key, existing ? existing.plus(amount) : amount);
    }
    return [...totals.entries()].map(([key, amount]) => {
      const [name, unit] = key.split('|');
      return { name, unit, amount: amount.toString() };
    });
  }

  private findTotal(totals: readonly NutritionTotal[], name: string, unit: string): NutritionTotal | undefined {
    return totals.find((total) => total.name === name && total.unit === unit);
  }
}
