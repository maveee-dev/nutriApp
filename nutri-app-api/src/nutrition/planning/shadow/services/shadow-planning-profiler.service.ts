import { Injectable } from '@nestjs/common';
import { ShadowDailyAggregateEvaluationService } from './shadow-daily-aggregate-evaluation.service.js';
import { ShadowMealPlanningService } from './shadow-meal-planning.service.js';
import { ShadowPlanningInstrumentation } from './shadow-planning-instrumentation.js';
import type { ShadowPlanningProfileSource } from '../types/shadow-planning-profile.source.js';

@Injectable()
export class ShadowPlanningProfilerService {
  constructor(
    private readonly shadowMealPlanningService: ShadowMealPlanningService,
    private readonly dailyAggregateEvaluationService: ShadowDailyAggregateEvaluationService,
  ) {}

  /** Internal profiling entry point. It returns observations and never affects planner output. */
  async profile(userId: string, requestedDate?: string): Promise<ShadowPlanningProfileSource> {
    const instrumentation = new ShadowPlanningInstrumentation();
    const shadowPlan = await this.shadowMealPlanningService.generate(userId, requestedDate, undefined, instrumentation);
    const dailyAggregate = await this.dailyAggregateEvaluationService.evaluate(userId, shadowPlan, instrumentation);
    const metrics = instrumentation.snapshot();
    const stages = Object.entries(metrics.stages).sort((left, right) => right[1] - left[1]);
    const bottlenecks = stages.slice(0, 2).filter(([, durationMs]) => durationMs > 0).map(([stage]) => stage);
    const optimizationOpportunities: string[] = [];
    if (metrics.recipeEvaluations > 1) optimizationOpportunities.push('evaluate-recipe-compositions-with-shared-context-or-caching');
    if (metrics.databaseQueryCounts.canonicalFoodLookups > metrics.candidateMealsGenerated) optimizationOpportunities.push('reuse-canonical-food-details-across-candidates');
    if (metrics.combinationLimitHits > 0) optimizationOpportunities.push('review-template-slot-candidate-bounds');
    if (metrics.policyEvaluations > 1) optimizationOpportunities.push('measure-policy-context-reuse-opportunity');
    if (dailyAggregate.missingMealTypes.length > 0) optimizationOpportunities.push('increase-approved-template-coverage-before-activation');

    return {
      apiVersion: 'internal-shadow-profile-v1',
      userId,
      date: shadowPlan.date,
      asOf: shadowPlan.asOf,
      metrics,
      candidateCount: shadowPlan.evaluatedCandidateCount,
      selectedMealTypes: shadowPlan.selected.map(({ mealType }) => mealType),
      dailyAggregateEvaluated: dailyAggregate.evaluation != null,
      bottlenecks,
      optimizationOpportunities,
    };
  }
}
