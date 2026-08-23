import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RecipeEvaluationService } from '../../../recipes/services/recipe-evaluation.service.js';
import type { RecipeComponentSource } from '../../../recipes/types/recipe.source.js';
import type { RecipeEvaluationSource } from '../../../recipes/types/recipe-evaluation.source.js';
import type { ShadowDailyPlanningEvaluationSource } from '../types/shadow-daily-aggregate.source.js';
import type { ShadowHistoricalDailySnapshot, ShadowHistoricalMealPlanSnapshot, ShadowHistoricalMealSnapshot, ShadowHistoricalReplayResultSource } from './shadow-replay.source.js';

@Injectable()
export class ShadowHistoricalReplayService {
  constructor(private readonly recipeEvaluationService: RecipeEvaluationService) {}

  capture(run: ShadowDailyPlanningEvaluationSource): ShadowHistoricalMealPlanSnapshot {
    const shadowPlan = run.shadowPlan;
    const meals = shadowPlan.selected.map((candidate): ShadowHistoricalMealSnapshot => ({
      mealType: candidate.mealType,
      templateVersionId: candidate.templateVersionId,
      templateVersion: candidate.templateVersion,
      templateProvenance: candidate.templateProvenance,
      recipeVersionIds: candidate.resolvedSources.filter(({ source }) => source === 'recipe').map(({ sourceId }) => sourceId),
      components: candidate.components,
      recipeId: candidate.evaluation.recipeId,
      recipeEvaluationVersionId: candidate.evaluation.recipeVersionId,
      recipeEvaluationVersion: candidate.evaluation.recipeVersion,
      evaluationFingerprint: candidate.evaluation.provenance.recipeFingerprint,
      canonicalFoodFingerprints: candidate.evaluation.provenance.canonicalFoods,
      targetCalculation: candidate.evaluation.targetCalculation,
      deferredPolicyIds: candidate.evaluation.evaluation.deferredPolicies.map(({ policyId }) => policyId),
      ...(candidate.evaluation.mealAssessment == null ? {} : { mealAssessment: candidate.evaluation.mealAssessment }),
    }));
    const aggregate = run.dailyAggregate.evaluation;
    const dailyAggregate: ShadowHistoricalDailySnapshot | null = aggregate == null ? null : {
      components: this.aggregateComponents(shadowPlan.selected),
      recipeId: aggregate.recipeId,
      recipeEvaluationVersionId: aggregate.recipeVersionId,
      recipeEvaluationVersion: aggregate.recipeVersion,
      evaluationFingerprint: aggregate.provenance.recipeFingerprint,
      canonicalFoodFingerprints: aggregate.provenance.canonicalFoods,
      targetCalculation: aggregate.targetCalculation,
      deferredPolicyIds: aggregate.evaluation.deferredPolicies.map(({ policyId }) => policyId),
      ...(aggregate.mealAssessment == null ? {} : { mealAssessment: aggregate.mealAssessment }),
    };
    const snapshot = {
      apiVersion: 'shadow-historical-snapshot-v1' as const,
      userId: shadowPlan.userId,
      date: shadowPlan.date,
      evaluationTimestamp: run.dailyAggregate.asOf,
      policySetFingerprint: run.dailyAggregate.provenance.policySetFingerprint ?? shadowPlan.provenance.policySetFingerprints[0] ?? null,
      meals,
      dailyAggregate,
      ...(shadowPlan.dailyAdherence == null ? {} : { dailyAdherence: shadowPlan.dailyAdherence }),
      snapshotFingerprint: '',
    };
    return { ...snapshot, snapshotFingerprint: this.fingerprint({ ...snapshot, snapshotFingerprint: undefined }) };
  }

  async replay(snapshot: ShadowHistoricalMealPlanSnapshot): Promise<ShadowHistoricalReplayResultSource> {
    const failureReasons: string[] = [];
    const limitations: string[] = [];
    const mealEvaluations: RecipeEvaluationSource[] = [];
    for (const meal of snapshot.meals) {
      try {
        const evaluation = await this.recipeEvaluationService.evaluateComposition(snapshot.userId, {
          recipeId: meal.recipeId,
          recipeVersionId: meal.recipeEvaluationVersionId,
          recipeVersion: meal.recipeEvaluationVersion,
          yieldServings: '1',
          components: meal.components,
        }, { targetCalculation: meal.targetCalculation, policySetFingerprint: snapshot.policySetFingerprint, includeMealAssessment: false });
        const replayedEvaluation = meal.mealAssessment == null ? evaluation : { ...evaluation, mealAssessment: meal.mealAssessment };
        mealEvaluations.push(replayedEvaluation);
        if (meal.mealAssessment == null) limitations.push(`historical-meal-assessment-unavailable:${meal.mealType.toLowerCase()}`);
        this.compareEvaluation(`meal:${meal.mealType}`, meal.evaluationFingerprint, meal.canonicalFoodFingerprints, meal.deferredPolicyIds, replayedEvaluation, failureReasons);
      } catch {
        failureReasons.push(`replay-evaluation-failed:${meal.mealType.toLowerCase()}`);
      }
    }
    let dailyEvaluation: RecipeEvaluationSource | null = null;
    if (snapshot.dailyAggregate != null) {
      try {
        const daily = snapshot.dailyAggregate;
        const replayedDailyEvaluation = await this.recipeEvaluationService.evaluateComposition(snapshot.userId, {
          recipeId: daily.recipeId,
          recipeVersionId: daily.recipeEvaluationVersionId,
          recipeVersion: daily.recipeEvaluationVersion,
          yieldServings: '1',
          components: daily.components,
        }, { targetCalculation: daily.targetCalculation, policySetFingerprint: snapshot.policySetFingerprint, includeMealAssessment: false });
        dailyEvaluation = daily.mealAssessment == null ? replayedDailyEvaluation : { ...replayedDailyEvaluation, mealAssessment: daily.mealAssessment };
        if (daily.mealAssessment == null) limitations.push('historical-daily-meal-assessment-unavailable');
        this.compareEvaluation('daily-aggregate', daily.evaluationFingerprint, daily.canonicalFoodFingerprints, daily.deferredPolicyIds, dailyEvaluation, failureReasons);
      } catch {
        failureReasons.push('replay-evaluation-failed:daily-aggregate');
      }
    }
    return {
      apiVersion: 'shadow-historical-replay-v1',
      snapshotFingerprint: snapshot.snapshotFingerprint,
      replayable: failureReasons.length === 0,
      failureReasons: [...new Set(failureReasons)],
      evaluationTimestamp: snapshot.evaluationTimestamp,
      policySetFingerprint: snapshot.policySetFingerprint,
      replayedMealEvaluations: mealEvaluations,
      replayedDailyEvaluation: dailyEvaluation,
      provenancePreserved: failureReasons.every((reason) =>
        !reason.includes('fingerprint') &&
        !reason.includes('policy-set') &&
        !reason.includes('deferred-policy'),
      ),
      limitations: [
        ...new Set([
          ...limitations,
          ...(snapshot.dailyAdherence == null ? ['historical-daily-adherence-unavailable'] : []),
        ]),
      ],
      ...(snapshot.dailyAdherence == null ? {} : { replayedDailyAdherence: snapshot.dailyAdherence }),
    };
  }

  private aggregateComponents(candidates: readonly { readonly mealType: string; readonly templateVersionId: string; readonly components: readonly RecipeComponentSource[] }[]): readonly RecipeComponentSource[] {
    return candidates.flatMap((candidate) => candidate.components.map((component) => ({
      ...component,
      id: `${candidate.mealType}:${candidate.templateVersionId}:${component.id}`,
    })));
  }

  private compareEvaluation(
    label: string,
    expectedFingerprint: string,
    expectedCanonicalFoods: ShadowHistoricalMealSnapshot['canonicalFoodFingerprints'],
    expectedDeferredPolicyIds: readonly string[],
    actual: RecipeEvaluationSource,
    failures: string[],
  ): void {
    if (actual.provenance.recipeFingerprint !== expectedFingerprint) failures.push(`evaluation-fingerprint-mismatch:${label}`);
    if (this.fingerprint(actual.provenance.canonicalFoods) !== this.fingerprint(expectedCanonicalFoods)) failures.push(`canonical-food-fingerprint-mismatch:${label}`);
    if (this.fingerprint(actual.evaluation.deferredPolicies.map(({ policyId }) => policyId)) !== this.fingerprint(expectedDeferredPolicyIds)) failures.push(`deferred-policy-mismatch:${label}`);
  }

  private fingerprint(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
}
