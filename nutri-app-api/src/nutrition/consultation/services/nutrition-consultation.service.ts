import { Injectable } from '@nestjs/common';
import { LaboratoryResultsService } from '../../../laboratory/services/laboratory-results.service.js';
import { NutritionAnalysisService } from '../../analysis/services/nutrition-analysis.service.js';
import { RecommendationResponseMapper } from '../../recommendations/mappers/recommendation-response.mapper.js';
import { RecommendationService } from '../../recommendations/recommendation.service.js';
import { RecommendationResolution } from '../../recommendations/types/recommendation-resolver.type.js';
import { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import { ConsultationLaboratoryEvidenceDto, NutritionConsultationResponseDto } from '../dto/consultation-response.dto.js';
import { ConsultationIntentRouter } from './consultation-intent.router.js';
import { FoodEntityResolver } from './food-entity-resolver.js';
import { FoodEvaluationConsultationService } from './food-evaluation-consultation.service.js';
import type { NutritionConsultationLane } from '../types/consultation-route.type.js';
import type { MealContextAvailability } from '../types/meal-context-availability.type.js';

@Injectable()
export class NutritionConsultationService {
  constructor(
    private readonly analysisService: NutritionAnalysisService,
    private readonly recommendationService: RecommendationService,
    private readonly laboratoryResultsService: LaboratoryResultsService,
    private readonly consultationRouter: ConsultationIntentRouter = new ConsultationIntentRouter(),
    private readonly foodEntityResolver: FoodEntityResolver,
    private readonly foodEvaluationConsultationService?: FoodEvaluationConsultationService,
  ) {}

  async consult(userId: string, question: string, requestedDate?: string): Promise<NutritionConsultationResponseDto> {
    const route = this.consultationRouter.route(question);
    const date = requestedDate ?? new Date().toISOString().slice(0, 10);
    const historicalReplay = date < new Date().toISOString().slice(0, 10)
      && typeof this.analysisService.getHistoricalSummary === 'function';
    const summary = historicalReplay
      ? (await this.analysisService.getHistoricalSummary(userId, date)).days.find((day) => day.date === date)
        ?? await this.analysisService.getDailySummary(userId, date)
      : await this.analysisService.getDailySummary(userId, date);
    const resolution = historicalReplay
      ? this.recommendationService.recommendHistorical(userId, [summary])
      : this.recommendationService.recommendDaily(userId, summary);
    const laboratoryResults = await this.laboratoryResultsService.findMany(userId, {});
    const intent = this.classifyIntent(question, route.lane);
    const laboratoryEvidence = this.mapLaboratoryEvidence(laboratoryResults, summary);
    const mealContext = this.resolveMealContext(route.lane, summary.mealCount);
    const foodResolution = route.lane === 'food'
      ? await this.foodEntityResolver.resolve(userId, question)
      : undefined;
    const foodEvaluation = foodResolution == null || this.foodEvaluationConsultationService == null
      ? undefined
      : await this.foodEvaluationConsultationService.evaluate(userId, foodResolution);

    return {
      apiVersion: 'v1',
      assistantMode: 'deterministic-evidence',
      question,
      date,
      intent,
      mealContext,
      ...(foodResolution == null ? {} : { foodResolution }),
      ...(foodEvaluation == null ? {} : { foodEvaluation }),
      answer: this.buildAnswer(intent, summary, resolution, mealContext, foodResolution, foodEvaluation),
      recommendations: historicalReplay
        ? RecommendationResponseMapper.toHistoricalResponse(userId, date, date, resolution)
        : RecommendationResponseMapper.toDailyResponse(userId, date, resolution),
      laboratoryEvidence,
      limitations: [
        'This guidance explains approved nutrition policies and recorded evidence; it does not diagnose, prescribe, or replace professional medical advice.',
        ...(summary.deferredPolicies.length > 0 ? ['Some guidance is deferred because required evidence is missing, stale, or outside the approved policy scope.'] : []),
        ...(mealContext === 'unavailable' ? ['Meal-specific guidance is unavailable because no meal is logged for this date.'] : []),
        ...(resolution.evaluation?.replayLimitations.length ? ['Some historical evaluation details could not be replayed because the required stored evaluation context was incomplete or incompatible.'] : []),
      ],
    };
  }

  private resolveMealContext(
    lane: NutritionConsultationLane,
    mealCount: number,
  ): MealContextAvailability {
    if (lane !== 'meal-progress') return 'notRequired';
    return mealCount > 0 ? 'available' : 'unavailable';
  }

  private classifyIntent(question: string, lane?: NutritionConsultationLane): string {
    const normalized = question.trim().toLowerCase();
    if (lane === 'recommendation' && !/(why|recommend|explain)/.test(normalized)) return 'recommendation';
    if (/(lab|laboratory|egfr|result|test)/.test(normalized)) return 'laboratory-evidence';
    if (/(why|recommend|explain)/.test(normalized)) return 'recommendation-explanation';
    if (/(avoid|shouldn't|should not)/.test(normalized)) return 'avoidance-guidance';
    if (/(eat|food|meal|can i)/.test(normalized)) return 'food-fit';
    if (/(improve|goal|today|progress)/.test(normalized)) return 'daily-improvement';
    return 'daily-guidance';
  }

  private buildAnswer(
    intent: string,
    summary: DailyNutritionSummarySource,
    resolution: RecommendationResolution,
    mealContext: MealContextAvailability,
    foodResolution?: Awaited<ReturnType<FoodEntityResolver['resolve']>>,
    foodEvaluation?: Awaited<ReturnType<FoodEvaluationConsultationService['evaluate']>>,
  ): string {
    const selected = resolution.selected;
    const policyContext = this.policyContext(summary);
    if (resolution.evaluation?.replayLimitations.length && selected.length === 0) {
      return 'I can show the guidance that was recorded, but some historical evaluation details cannot be replayed completely because the stored evaluation context is incomplete or incompatible.';
    }
    if (selected.length > 0) {
      const lead = intent === 'avoidance-guidance'
        ? 'Here are the most important things to be mindful of today:'
        : intent === 'laboratory-evidence'
          ? 'Here is how your recorded evidence connects to today\'s guidance:'
          : 'Based on today\'s approved nutrition guidance:';
      const contextExplanation = policyContext.length === 0 ? '' : ` This guidance uses your active ${policyContext.join(' and ')} nutrition policies.`;
      return `${lead}${contextExplanation} ${selected.slice(0, 2).map((item) => item.message).join(' ')}`;
    }
    if (foodResolution?.status === 'ambiguous') {
      const choices = foodResolution.clarification?.choices ?? foodResolution.candidates;
      const choiceText = choices
        .slice(0, 5)
        .map((candidate, index) => {
          const variant = candidate.variantLabel == null ? '' : ` — ${candidate.variantLabel}`;
          const type = candidate.kind === 'approved-recipe' ? 'approved recipe' : 'food';
          return `${index + 1}. ${candidate.displayName}${variant} (${type})`;
        })
        .join('\n');
      return `I found several possible foods. Which one did you mean?\n${choiceText}`;
    }
    if (foodResolution?.status === 'not-found') {
      return 'I could not find a confident match in the food catalog. Try a more specific food name or spelling.';
    }
    if (foodResolution?.status === 'resolved' && foodResolution.candidates[0]?.kind === 'approved-recipe') {
      return `I found the approved recipe ${foodResolution.candidates[0].displayName}. Recipe component evaluation is not available yet, so I have not inferred a compatibility result for the recipe.`;
    }
    if (foodEvaluation != null) {
      const foodName = foodEvaluation.displayName;
      if (foodEvaluation.evaluation.evaluationStatus === 'insufficient-evidence') {
        return `I found ${foodName} using the ${foodEvaluation.serving.name} serving, but there is not enough applicable nutrient evidence to produce a compatibility score for this portion.`;
      }
      return `I evaluated ${foodName} using ${foodEvaluation.serving.name} (${foodEvaluation.serving.grams} g). Its compatibility score is ${foodEvaluation.evaluation.score}/100. The detailed compatibility reasons, contributions, evidence coverage, and any deferrals are included below.`;
    }
    if (mealContext === 'unavailable') return 'You have not logged a meal today yet. Once you do, I can compare it with your active goals and explain the guidance.';
    if (mealContext === 'notRequired') return 'Your active nutrition guidance and recorded evidence are available. Meal logs are only needed when you want daily progress or meal-specific feedback.';
    return 'You are on a steady path today. Keep logging meals and I can help you choose the next small improvement from your active goals.';
  }

  private policyContext(summary: DailyNutritionSummarySource): readonly string[] {
    const labels = new Map<string, string>([
      ['ckd', 'CKD'],
      ['hypertension', 'hypertension'],
      ['diabetes', 'diabetes'],
    ]);
    const contexts = (summary.targetProvenance ?? [])
      .map(({ applicability }) => applicability?.conditionCode ?? null)
      .filter((value): value is string => value != null)
      .map((value) => labels.get(value.toLowerCase()) ?? value);
    return [...new Set(contexts)];
  }

  private mapLaboratoryEvidence(results: Awaited<ReturnType<LaboratoryResultsService['findMany']>>, summary: DailyNutritionSummarySource): ConsultationLaboratoryEvidenceDto[] {
    return results.map((result) => {
      const usedByPolicies = (summary.targetProvenance ?? [])
        .filter((provenance) => {
          const laboratory = provenance.applicability?.laboratory;
          return laboratory?.testCode === result.testCode && laboratory.collectedAt === result.collectedAt.toISOString();
        })
        .map((provenance) => ({ policyId: provenance.policyId, version: provenance.version, explanation: provenance.explanation }));
      const stale = summary.deferredPolicies.some((policy) => policy.reason === `stale-${result.testCode}`);
      return {
        id: result.id,
        testCode: result.testCode,
        value: result.value,
        unit: result.unit,
        collectedAt: result.collectedAt.toISOString(),
        status: usedByPolicies.length > 0 ? 'current' : stale ? 'stale' : 'recorded',
        source: 'manual-entry',
        usedByPolicies,
      };
    });
  }
}
