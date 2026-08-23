import { performance } from 'node:perf_hooks';
import type { ShadowPlanningMetrics, ShadowPlanningStage } from '../types/shadow-planning-profile.source.js';

const STAGES: readonly ShadowPlanningStage[] = [
  'databaseLoadingMs',
  'templateSelectionMs',
  'slotResolutionMs',
  'recipeEvaluationMs',
  'rankingMs',
  'dailyAggregateEvaluationMs',
];

export class ShadowPlanningInstrumentation {
  private readonly startedAt = performance.now();
  private readonly stageTimes = new Map<ShadowPlanningStage, number>(STAGES.map((stage) => [stage, 0]));
  private readonly counters = {
    templatesEvaluated: 0,
    recipesEvaluated: 0,
    recipeEvaluations: 0,
    recipeComponentsEvaluated: 0,
    policyEvaluations: 0,
    nutritionAggregations: 0,
    candidateMealsGenerated: 0,
    candidateMealsDiscarded: 0,
    slotsWithoutCandidates: 0,
    disallowedFallbacks: 0,
    templateLookups: 0,
    recipeLookups: 0,
    canonicalFoodLookups: 0,
    servingLookups: 0,
    maximumCandidatesPerSlot: 0,
    maximumSlotCombinations: 0,
    combinationLimitHits: 0,
  };

  async measure<T>(stage: ShadowPlanningStage, operation: () => Promise<T>): Promise<T> {
    const startedAt = performance.now();
    try {
      return await operation();
    } finally {
      this.stageTimes.set(stage, (this.stageTimes.get(stage) ?? 0) + performance.now() - startedAt);
    }
  }

  add(stage: ShadowPlanningStage, durationMs: number): void {
    this.stageTimes.set(stage, (this.stageTimes.get(stage) ?? 0) + durationMs);
  }

  increment(counter: keyof typeof this.counters, amount = 1): void {
    this.counters[counter] += amount;
  }

  max(counter: 'maximumCandidatesPerSlot' | 'maximumSlotCombinations', value: number): void {
    this.counters[counter] = Math.max(this.counters[counter], value);
  }

  snapshot(): ShadowPlanningMetrics {
    return {
      totalExecutionMs: performance.now() - this.startedAt,
      stages: Object.fromEntries(STAGES.map((stage) => [stage, this.stageTimes.get(stage) ?? 0])) as Readonly<Record<ShadowPlanningStage, number>>,
      templatesEvaluated: this.counters.templatesEvaluated,
      recipesEvaluated: this.counters.recipesEvaluated,
      recipeEvaluations: this.counters.recipeEvaluations,
      recipeComponentsEvaluated: this.counters.recipeComponentsEvaluated,
      policyEvaluations: this.counters.policyEvaluations,
      nutritionAggregations: this.counters.nutritionAggregations,
      candidateMealsGenerated: this.counters.candidateMealsGenerated,
      candidateMealsDiscarded: this.counters.candidateMealsDiscarded,
      slotsWithoutCandidates: this.counters.slotsWithoutCandidates,
      disallowedFallbacks: this.counters.disallowedFallbacks,
      databaseQueryCounts: {
        templateLookups: this.counters.templateLookups,
        recipeLookups: this.counters.recipeLookups,
        canonicalFoodLookups: this.counters.canonicalFoodLookups,
        servingLookups: this.counters.servingLookups,
      },
      maximumCandidatesPerSlot: this.counters.maximumCandidatesPerSlot,
      maximumSlotCombinations: this.counters.maximumSlotCombinations,
      combinationLimitHits: this.counters.combinationLimitHits,
    };
  }
}
