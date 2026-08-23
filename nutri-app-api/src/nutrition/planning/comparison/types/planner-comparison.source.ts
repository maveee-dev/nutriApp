import type { DailyMealPlanResponseDto } from '../../dto/daily-meal-plan-response.dto.js';
import type { ShadowMealCandidateSource, ShadowMealPlanningResultSource } from '../../shadow/types/shadow-meal-planning.source.js';

export interface PlannerComparisonSide {
  readonly selected: boolean;
  readonly identifier: string | null;
  readonly label: string | null;
  readonly score: number | null;
  readonly evidenceCoverage: number | null;
  readonly activePolicyCoverage: number;
  readonly deferredPolicyIds: readonly string[];
}

export interface PlannerComparisonRecordSource {
  readonly mealType: string;
  readonly production: PlannerComparisonSide;
  readonly shadow: PlannerComparisonSide & {
    readonly templateId: string | null;
    readonly templateVersionId: string | null;
    readonly templateProvenance: ShadowMealCandidateSource['templateProvenance'] | null;
    readonly resolvedSources: ShadowMealCandidateSource['resolvedSources'];
    readonly rankingRationale: ShadowMealCandidateSource['rankInputs'] | null;
  };
  readonly scoreDelta: number | null;
  readonly evidenceCoverageDelta: number | null;
  readonly differences: readonly string[];
}

export interface PlannerComparisonResultSource {
  readonly apiVersion: 'internal-planner-comparison-v1';
  readonly userId: string;
  readonly date: string;
  readonly asOf: string;
  readonly production: Pick<DailyMealPlanResponseDto, 'provenance' | 'policySetFingerprint'>;
  readonly shadow: Pick<ShadowMealPlanningResultSource, 'provenance' | 'evaluatedCandidateCount'>;
  readonly comparisons: readonly PlannerComparisonRecordSource[];
}
