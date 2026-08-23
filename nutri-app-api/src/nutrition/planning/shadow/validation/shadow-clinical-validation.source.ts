import type { ShadowDailyPlanningEvaluationSource } from '../types/shadow-daily-aggregate.source.js';
import type { ShadowClinicalFixture } from './shadow-clinical-fixtures.js';

export interface ShadowClinicalFixtureValidationReport {
  readonly fixtureId: string;
  readonly selectedMealPlan: readonly {
    readonly mealType: string;
    readonly templateVersionId: string;
    readonly recipeSources: readonly string[];
  }[];
  readonly aggregateDailyEvaluation: {
    readonly score: number;
    readonly coverage: number;
  } | null;
  readonly compatibilityScore: number | null;
  readonly policyCoverage: number;
  readonly evidenceCoverage: number;
  readonly deferredPolicies: readonly string[];
  readonly plannerLimitations: readonly string[];
  readonly deterministicFingerprints: {
    readonly first: string;
    readonly second: string;
  };
  readonly pass: boolean;
  readonly failures: readonly string[];
}

export interface ShadowClinicalFixtureValidationRun {
  readonly first: ShadowDailyPlanningEvaluationSource;
  readonly second: ShadowDailyPlanningEvaluationSource;
}

export interface ShadowClinicalFixtureValidationInput {
  readonly fixture: ShadowClinicalFixture;
  readonly run: ShadowClinicalFixtureValidationRun;
}
