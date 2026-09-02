import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { CONDITION_CODES } from '../../conditions/types/condition-code.js';
import type { FoodEvaluationSource, FoodEvaluationContribution } from '../evaluation/types/food-evaluation.type.js';
import type { NutritionInsight, NutritionInsightCategory } from './types/nutrition-insight.type.js';

export interface NutritionInsightInput {
  readonly evaluation: FoodEvaluationSource;
  /** Optional because the normal food-evaluation response already carries the
   * policy deferrals needed to explain missing CKD targets. */
  readonly conditionCodes?: readonly string[];
}

/**
 * Projects educational nutrition context from deterministic evaluation data.
 *
 * This service intentionally does not calculate targets, evaluate policies, or
 * participate in scoring. It only formats already-calculated contributions and
 * existing policy deferrals for patient-facing use.
 */
@Injectable()
export class NutritionInsightService {
  generate(input: NutritionInsightInput): readonly NutritionInsight[] {
    const insights: NutritionInsight[] = [];
    const contributions = new Map(
      input.evaluation.contributions.map((contribution) => [this.normalizeNutrient(contribution.nutrient), contribution]),
    );
    const deferralReasons = new Set(input.evaluation.deferredPolicies.map(({ reason }) => reason));
    const isCkd = input.conditionCodes?.includes(CONDITION_CODES.CKD) ?? false;

    this.addMineralInsight(insights, contributions.get('potassium'), 'potassium', deferralReasons.has('missing-individualized-potassium-target'), isCkd);
    this.addMineralInsight(insights, contributions.get('phosphorus'), 'phosphorus', deferralReasons.has('missing-individualized-phosphorus-target'), isCkd);
    this.addSodiumInsight(insights, contributions.get('sodium'));
    this.addFiberInsight(insights, contributions.get('fiber'));

    return insights;
  }

  private addMineralInsight(
    insights: NutritionInsight[],
    contribution: FoodEvaluationContribution | undefined,
    category: 'potassium' | 'phosphorus',
    missingPersonalizedTarget: boolean,
    isCkd: boolean,
  ): void {
    if (contribution == null || !this.isPositive(contribution.amount)) return;

    const unit = contribution.unit ?? 'mg';
    const personalizedTarget = contribution.targetValue;
    const message = personalizedTarget == null
      ? missingPersonalizedTarget || isCkd
        ? `This serving contains approximately ${contribution.amount} ${unit} of ${category}. Because no personalized ${category} target is configured, NutriApp cannot determine whether this amount fits your individual daily allowance.`
        : `This serving contains approximately ${contribution.amount} ${unit} of ${category}. Individual ${category} needs can vary, so use this nutrition information together with guidance from your healthcare professional.`
      : `This serving contains approximately ${contribution.amount} ${unit} of ${category}. This amount was included in the compatibility score using your personalized ${category} target.`;

    insights.push({
      category,
      severity: 'information',
      title: `${this.capitalize(category)} information`,
      message,
      evidence: { nutrient: category, amount: contribution.amount, unit },
    });
  }

  private addSodiumInsight(insights: NutritionInsight[], contribution: FoodEvaluationContribution | undefined): void {
    if (contribution == null || contribution.targetValue == null || !this.isPositive(contribution.amount)) return;

    const unit = contribution.unit ?? 'mg';
    if (!this.isSmallShareOfTarget(contribution.amount, contribution.targetValue)) return;

    insights.push({
      category: 'sodium',
      severity: 'positive',
      title: 'Lower-sodium choice',
      message: `This serving contains approximately ${contribution.amount} ${unit} of sodium, which is a relatively small share of the current daily sodium guidance.`,
      evidence: { nutrient: 'sodium', amount: contribution.amount, unit },
    });
  }

  private addFiberInsight(insights: NutritionInsight[], contribution: FoodEvaluationContribution | undefined): void {
    if (contribution == null || !this.isPositive(contribution.amount)) return;

    const unit = contribution.unit ?? 'g';
    insights.push({
      category: 'fiber',
      severity: 'positive',
      title: 'Fiber contribution',
      message: `This serving contributes approximately ${contribution.amount} ${unit} of dietary fiber, which supports digestive health.`,
      evidence: { nutrient: 'fiber', amount: contribution.amount, unit },
    });
  }

  private isPositive(value: string): boolean {
    try {
      return new Decimal(value).gt(0);
    } catch {
      return false;
    }
  }

  /**
   * A small-share label is presentation-only. It is not a nutrition target,
   * CKD threshold, compatibility rule, or recommendation policy.
   */
  private isSmallShareOfTarget(amount: string, target: string): boolean {
    try {
      return new Decimal(amount).lte(new Decimal(target).mul('0.1'));
    } catch {
      return false;
    }
  }

  private normalizeNutrient(value: string): NutritionInsightCategory | string {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/-/g, ' ');
    if (normalized === 'potassium') return 'potassium';
    if (normalized === 'phosphorus') return 'phosphorus';
    if (normalized === 'sodium') return 'sodium';
    if (normalized === 'fiber' || normalized === 'dietary fiber') return 'fiber';
    return normalized;
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

