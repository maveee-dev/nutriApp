import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RecipeEvaluationService } from '../../../recipes/services/recipe-evaluation.service.js';
import type { ShadowDailyAggregateEvaluationSource, ShadowDailyPlanningEvaluationSource } from '../types/shadow-daily-aggregate.source.js';
import type { ShadowMealCandidateSource, ShadowMealPlanningResultSource } from '../types/shadow-meal-planning.source.js';
import { ShadowMealPlanningService } from './shadow-meal-planning.service.js';
import type { ShadowPlanningInstrumentation } from './shadow-planning-instrumentation.js';

const DAILY_MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const;

@Injectable()
export class ShadowDailyAggregateEvaluationService {
  constructor(
    private readonly recipeEvaluationService: RecipeEvaluationService,
    private readonly shadowMealPlanningService: ShadowMealPlanningService,
  ) {}

  async evaluateForUser(userId: string, requestedDate?: string): Promise<ShadowDailyPlanningEvaluationSource> {
    const shadowPlan = await this.shadowMealPlanningService.generate(userId, requestedDate);
    return { shadowPlan, dailyAggregate: await this.evaluate(userId, shadowPlan) };
  }

  /** Evaluates selected shadow meals as one deterministic daily composition. */
  async evaluate(userId: string, shadowPlan: ShadowMealPlanningResultSource, instrumentation?: ShadowPlanningInstrumentation): Promise<ShadowDailyAggregateEvaluationSource> {
    const selected = DAILY_MEAL_TYPES
      .map((mealType) => shadowPlan.selected.find((candidate) => candidate.mealType === mealType))
      .filter((candidate): candidate is ShadowMealCandidateSource => candidate != null);
    const selectedMealTypes = selected.map(({ mealType }) => mealType);
    const missingMealTypes = DAILY_MEAL_TYPES.filter((mealType) => !selectedMealTypes.includes(mealType));
    const limitations: string[] = missingMealTypes.map((mealType) => `daily-plan-incomplete:${mealType.toLowerCase()}`);
    const components = selected.flatMap((candidate) => candidate.components.map((component) => ({
      ...component,
      id: `${candidate.mealType}:${candidate.templateVersionId}:${component.id}`,
    })));

    if (components.length === 0) {
      limitations.push('daily-plan-no-evaluable-meals');
      return this.emptyResult(userId, shadowPlan, selectedMealTypes, missingMealTypes, limitations);
    }

    instrumentation?.increment('recipeEvaluations');
    instrumentation?.increment('policyEvaluations');
    instrumentation?.increment('nutritionAggregations');
    instrumentation?.increment('recipeComponentsEvaluated', components.length);
    const evaluateComposition = () => this.recipeEvaluationService.evaluateComposition(userId, {
      recipeId: `shadow-daily-plan:${shadowPlan.date}`,
      recipeVersionId: `shadow-daily-plan:${shadowPlan.date}`,
      recipeVersion: 1,
      yieldServings: '1',
      components,
    });
    const evaluation = instrumentation == null
      ? await evaluateComposition()
      : await instrumentation.measure('dailyAggregateEvaluationMs', evaluateComposition);
    limitations.push(...evaluation.evaluation.deferredPolicies.map(({ policyId }) => `deferred-policy:${policyId}`));
    limitations.push(...evaluation.evaluation.reasons
      .filter(({ direction }) => direction === 'negative')
      .map(({ nutrient }) => `daily-policy-constraint-not-satisfied:${nutrient}`));
    limitations.push(...evaluation.limitations);

    return {
      apiVersion: 'shadow-daily-aggregate-v1',
      userId,
      date: shadowPlan.date,
      asOf: shadowPlan.asOf,
      selectedMealTypes,
      missingMealTypes,
      evaluation,
      limitations: [...new Set(limitations)],
      provenance: {
        planner: 'recipe-template-shadow-planner',
        templateVersionIds: selected.map(({ templateVersionId }) => templateVersionId),
        recipeVersionIds: [...new Set(selected.flatMap(({ resolvedSources }) => resolvedSources.filter(({ source }) => source === 'recipe').map(({ sourceId }) => sourceId)))],
        policySetFingerprint: evaluation.provenance.policySetFingerprint,
        dailyPlanFingerprint: this.fingerprint({
          date: shadowPlan.date,
          selected: selected.map(({ mealType, templateVersionId, evaluation: mealEvaluation }) => ({ mealType, templateVersionId, recipeFingerprint: mealEvaluation.provenance.recipeFingerprint })),
          aggregateRecipeFingerprint: evaluation.provenance.recipeFingerprint,
        }),
      },
    };
  }

  private emptyResult(
    userId: string,
    shadowPlan: ShadowMealPlanningResultSource,
    selectedMealTypes: readonly string[],
    missingMealTypes: readonly string[],
    limitations: readonly string[],
  ): ShadowDailyAggregateEvaluationSource {
    return {
      apiVersion: 'shadow-daily-aggregate-v1',
      userId,
      date: shadowPlan.date,
      asOf: shadowPlan.asOf,
      selectedMealTypes,
      missingMealTypes,
      evaluation: null,
      limitations,
      provenance: {
        planner: 'recipe-template-shadow-planner',
        templateVersionIds: [],
        recipeVersionIds: [],
        policySetFingerprint: null,
        dailyPlanFingerprint: null,
      },
    };
  }

  private fingerprint(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
}
