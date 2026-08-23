import { Injectable } from '@nestjs/common';
import type { DailyMealPlanResponseDto, MealPlanItemDto } from '../../dto/daily-meal-plan-response.dto.js';
import { MealPlanningService } from '../../services/meal-planning.service.js';
import { ShadowMealPlanningService } from '../../shadow/services/shadow-meal-planning.service.js';
import type { ShadowMealCandidateSource } from '../../shadow/types/shadow-meal-planning.source.js';
import type { PlannerComparisonRecordSource, PlannerComparisonResultSource, PlannerComparisonSide } from '../types/planner-comparison.source.js';

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const;

@Injectable()
export class PlannerComparisonService {
  constructor(
    private readonly productionPlanner: MealPlanningService,
    private readonly shadowPlanner: ShadowMealPlanningService,
  ) {}

  /** Internal diagnostics only. No controller or production workflow calls this service. */
  async compare(userId: string, requestedDate?: string): Promise<PlannerComparisonResultSource> {
    const [production, shadow] = await Promise.all([
      this.productionPlanner.generate(userId, requestedDate),
      this.shadowPlanner.generate(userId, requestedDate),
    ]);
    const comparisons = MEAL_TYPES.map((mealType) => this.compareMealType(mealType, production, shadow.selected));
    return {
      apiVersion: 'internal-planner-comparison-v1',
      userId,
      date: production.date,
      asOf: production.asOf,
      production: {
        provenance: production.provenance,
        policySetFingerprint: production.policySetFingerprint,
      },
      shadow: {
        provenance: shadow.provenance,
        evaluatedCandidateCount: shadow.evaluatedCandidateCount,
      },
      comparisons,
    };
  }

  private compareMealType(mealType: typeof MEAL_TYPES[number], production: DailyMealPlanResponseDto, shadowCandidates: readonly ShadowMealCandidateSource[]): PlannerComparisonRecordSource {
    const productionItem = production.items.find((item) => item.mealType === mealType) ?? null;
    const shadowCandidate = shadowCandidates.find((candidate) => candidate.mealType === mealType) ?? null;
    const productionSide = this.productionSide(productionItem, production);
    const shadowSide = this.shadowSide(shadowCandidate);
    const scoreDelta = productionItem == null || shadowCandidate == null ? null : shadowCandidate.evaluation.evaluation.score - productionItem.evaluation.score;
    const evidenceCoverageDelta = productionItem == null || shadowCandidate == null ? null : shadowCandidate.evaluation.evaluation.coverage - productionItem.evaluation.coverage;
    return {
      mealType,
      production: productionSide,
      shadow: shadowSide,
      scoreDelta,
      evidenceCoverageDelta,
      differences: this.differences(productionItem, shadowCandidate, scoreDelta, evidenceCoverageDelta),
    };
  }

  private productionSide(item: MealPlanItemDto | null, plan: DailyMealPlanResponseDto): PlannerComparisonSide {
    return {
      selected: item != null,
      identifier: item?.foodId ?? null,
      label: item?.foodName ?? null,
      score: item?.evaluation.score ?? null,
      evidenceCoverage: item?.evaluation.coverage ?? null,
      activePolicyCoverage: item == null ? 0 : Object.values(plan.targets).filter((value) => value != null).length,
      deferredPolicyIds: plan.deferredPolicies.map(({ policyId }) => policyId),
    };
  }

  private shadowSide(candidate: ShadowMealCandidateSource | null): PlannerComparisonRecordSource['shadow'] {
    return {
      selected: candidate != null,
      identifier: candidate?.evaluation.recipeVersionId ?? null,
      label: candidate?.templateName ?? null,
      score: candidate?.evaluation.evaluation.score ?? null,
      evidenceCoverage: candidate?.evaluation.evaluation.coverage ?? null,
      activePolicyCoverage: candidate?.rankInputs.activePolicyCoverage ?? 0,
      deferredPolicyIds: candidate?.evaluation.evaluation.deferredPolicies.map(({ policyId }) => policyId) ?? [],
      templateId: candidate?.templateId ?? null,
      templateVersionId: candidate?.templateVersionId ?? null,
      templateProvenance: candidate?.templateProvenance ?? null,
      resolvedSources: candidate?.resolvedSources ?? [],
      rankingRationale: candidate?.rankInputs ?? null,
    };
  }

  private differences(production: MealPlanItemDto | null, shadow: ShadowMealCandidateSource | null, scoreDelta: number | null, evidenceCoverageDelta: number | null): readonly string[] {
    const differences: string[] = [];
    if (production == null) differences.push('production-planner-no-selection');
    if (shadow == null) differences.push('shadow-planner-no-selection');
    if (production != null && shadow != null) {
      differences.push('selected-source-differs');
      if (scoreDelta != null && scoreDelta > 0) differences.push('shadow-compatibility-score-higher');
      if (scoreDelta != null && scoreDelta < 0) differences.push('production-compatibility-score-higher');
      if (scoreDelta === 0) differences.push('compatibility-score-equal');
      if (evidenceCoverageDelta != null && evidenceCoverageDelta > 0) differences.push('shadow-evidence-coverage-higher');
      if (evidenceCoverageDelta != null && evidenceCoverageDelta < 0) differences.push('production-evidence-coverage-higher');
      if (evidenceCoverageDelta === 0) differences.push('evidence-coverage-equal');
      if (shadow.evaluation.evaluation.deferredPolicies.length > 0) differences.push('shadow-has-deferred-policies');
      if (shadow.resolvedSources.some(({ source }) => source === 'canonical-food')) differences.push('shadow-uses-canonical-food-fallback');
      if (shadow.resolvedSources.some(({ source }) => source === 'recipe')) differences.push('shadow-uses-approved-recipe');
    }
    return differences;
  }
}
