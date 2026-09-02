import { Injectable, Optional } from '@nestjs/common';
import { LaboratoryResultsService } from '../../../laboratory/services/laboratory-results.service.js';
import { LaboratoryConsultationProjector } from '../../../laboratory/services/laboratory-consultation.projector.js';
import { NutritionAnalysisService } from '../../analysis/services/nutrition-analysis.service.js';
import { RecommendationResponseMapper } from '../../recommendations/mappers/recommendation-response.mapper.js';
import { RecommendationService } from '../../recommendations/recommendation.service.js';
import { RecommendationResolution } from '../../recommendations/types/recommendation-resolver.type.js';
import { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import { ConsultationLaboratoryEvidenceDto, ConsultationPendingClarificationDto, NutritionConsultationResponseDto } from '../dto/consultation-response.dto.js';
import { ConsultationIntentRouter } from './consultation-intent.router.js';
import { FoodEntityResolver } from './food-entity-resolver.js';
import { FoodEvaluationConsultationService } from './food-evaluation-consultation.service.js';
import { RecipeEvaluationService } from '../../recipes/services/recipe-evaluation.service.js';
import type { RecipeEvaluationSource } from '../../recipes/types/recipe-evaluation.source.js';
import { ConsultationFallbackGuidanceBuilder, renderGuidanceSections } from './consultation-fallback-guidance.builder.js';
import type { NutritionConsultationLane } from '../types/consultation-route.type.js';
import type { MealContextAvailability } from '../types/meal-context-availability.type.js';
import type { ConsultationClarificationSelection } from '../types/consultation-clarification.type.js';
import type { FoodEntityResolution } from '../types/food-entity-resolution.type.js';

@Injectable()
export class NutritionConsultationService {
  private readonly fallbackGuidanceBuilder = new ConsultationFallbackGuidanceBuilder();

  constructor(
    private readonly analysisService: NutritionAnalysisService,
    private readonly recommendationService: RecommendationService,
    private readonly laboratoryResultsService: LaboratoryResultsService,
    private readonly consultationRouter: ConsultationIntentRouter = new ConsultationIntentRouter(),
    private readonly foodEntityResolver: FoodEntityResolver,
    private readonly foodEvaluationConsultationService?: FoodEvaluationConsultationService,
    @Optional() private readonly laboratoryConsultationProjector?: LaboratoryConsultationProjector,
    @Optional() private readonly recipeEvaluationService?: RecipeEvaluationService,
  ) {}

  async consult(
    userId: string,
    question: string,
    requestedDate?: string,
    clarificationSelection?: ConsultationClarificationSelection,
  ): Promise<NutritionConsultationResponseDto> {
    const consultationQuestion = clarificationSelection?.originalQuestion ?? question;
    const route = this.consultationRouter.route(consultationQuestion);
    const clarification = clarificationSelection == null
      ? undefined
      : await this.resolveClarificationSelection(userId, clarificationSelection);
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
    const intent = this.classifyIntent(consultationQuestion, route.lane);
    const laboratoryEvidence = this.mapLaboratoryEvidence(laboratoryResults, summary);
    const laboratoryInsights = this.laboratoryConsultationProjector == null
      ? []
      : await this.laboratoryConsultationProjector.project(userId);
    const mealContext = this.resolveMealContext(route.lane, summary.mealCount);
    const foodResolution = route.lane === 'food'
      ? clarification?.resolution ?? await this.foodEntityResolver.resolve(userId, consultationQuestion)
      : undefined;
    const foodEvaluation = foodResolution?.status !== 'resolved' || this.foodEvaluationConsultationService == null
      ? undefined
      : await this.foodEvaluationConsultationService.evaluate(userId, foodResolution);
    const recipeCandidate = foodResolution?.status === 'resolved' && foodResolution.candidates[0]?.kind === 'approved-recipe'
      ? foodResolution.candidates[0]
      : undefined;
    const recipeEvaluation = recipeCandidate?.recipeId == null || this.recipeEvaluationService == null
      ? undefined
      : await this.recipeEvaluationService.evaluate(
        userId,
        recipeCandidate.recipeId,
        undefined,
        '1',
        recipeCandidate.recipeVersionId,
      ).catch(() => undefined);
    const pendingClarification = this.toPendingClarification(foodResolution);

    return {
      apiVersion: 'v1',
      assistantMode: 'deterministic-evidence',
      question: consultationQuestion,
      date,
      intent,
      mealContext,
      ...(foodResolution == null ? {} : { foodResolution }),
      ...(foodEvaluation == null ? {} : { foodEvaluation }),
      ...(recipeEvaluation == null ? {} : { recipeEvaluation }),
      ...(pendingClarification == null ? {} : { pendingClarification }),
      answer: this.buildAnswer(consultationQuestion, intent, summary, resolution, mealContext, foodResolution, foodEvaluation, recipeEvaluation, clarification?.error),
      recommendations: historicalReplay
        ? RecommendationResponseMapper.toHistoricalResponse(userId, date, date, resolution)
        : RecommendationResponseMapper.toDailyResponse(userId, date, resolution),
      laboratoryEvidence,
      ...(laboratoryInsights.length === 0 ? {} : { laboratoryInsights }),
      limitations: [
        'This guidance is educational. It does not diagnose, prescribe, or replace professional medical advice.',
        ...(resolution.evaluation?.replayLimitations.length ? ['Some historical details could not be shown because stored information was incomplete or incompatible.'] : []),
      ],
    };
  }

  private async resolveClarificationSelection(
    userId: string,
    selection: ConsultationClarificationSelection,
  ): Promise<{ resolution: FoodEntityResolution; error?: string }> {
    const currentResolution = await this.foodEntityResolver.resolve(userId, selection.originalQuestion);
    const currentChoices = currentResolution.status === 'ambiguous'
      ? currentResolution.clarification?.choices ?? currentResolution.candidates
      : currentResolution.status === 'resolved'
        ? currentResolution.candidates
        : [];
    const selected = currentChoices.find((candidate) => candidate.stableId === selection.selectedStableId);

    if (selected != null) {
      return {
        resolution: {
          status: 'resolved',
          query: selection.originalQuestion,
          candidates: [selected],
        },
      };
    }

    if (currentResolution.status === 'ambiguous') {
      return {
        resolution: currentResolution,
        error: 'That choice is not one of the available options. Please choose one of the options below.',
      };
    }

    return {
      resolution: {
        status: 'not-found',
        query: selection.originalQuestion,
        candidates: [],
      },
      error: 'That choice is no longer available. Please ask your question again to refresh the options.',
    };
  }

  private toPendingClarification(
    foodResolution: Awaited<ReturnType<FoodEntityResolver['resolve']>> | undefined,
  ): ConsultationPendingClarificationDto | undefined {
    if (foodResolution?.status !== 'ambiguous') return undefined;
    const choices = foodResolution.clarification?.choices ?? foodResolution.candidates;
    return {
      type: 'food',
      originalQuestion: foodResolution.query,
      choices: choices.slice(0, 5),
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
    question: string,
    intent: string,
    summary: DailyNutritionSummarySource,
    resolution: RecommendationResolution,
    mealContext: MealContextAvailability,
    foodResolution?: Awaited<ReturnType<FoodEntityResolver['resolve']>>,
    foodEvaluation?: Awaited<ReturnType<FoodEvaluationConsultationService['evaluate']>>,
    recipeEvaluation?: RecipeEvaluationSource,
    clarificationError?: string,
  ): string {
    const selected = resolution.selected;

    // Food questions have a more specific deterministic answer than the
    // daily recommendation projection. Resolve that answer first and only
    // add useful, non-deferred recommendations as supplemental guidance.
    const foodAnswer = this.buildFoodAnswer(question, foodResolution, foodEvaluation, recipeEvaluation);
    if (foodAnswer != null) {
      const historicalLimitation = resolution.evaluation?.replayLimitations.length
        ? 'Some historical details could not be shown because stored information was incomplete or incompatible.'
        : '';
      return [clarificationError, foodAnswer, this.buildRecommendationSupplement(selected), historicalLimitation]
        .filter(Boolean)
        .join('\n\n');
    }

    if (resolution.evaluation?.replayLimitations.length && selected.length === 0) {
      const guidance = this.fallbackGuidanceBuilder.build({ question, intent, summary, mealContext });
      return [guidance, 'Some historical details could not be shown because stored information was incomplete or incompatible.'].join('\n\n');
    }
    if (selected.length > 0) {
      const fallback = this.fallbackGuidanceBuilder.buildSections({ question, intent, summary, mealContext });
      const recommendationGuidance = this.buildRecommendationSupplement(selected);
      return [clarificationError, fallback.generalGuidance, recommendationGuidance, fallback.limitations]
        .filter(Boolean)
        .join('\n\n');
    }
    return [clarificationError, this.fallbackGuidanceBuilder.build({ question, intent, summary, mealContext })]
      .filter(Boolean)
      .join('\n\n');
  }

  private buildFoodAnswer(
    question: string,
    foodResolution: Awaited<ReturnType<FoodEntityResolver['resolve']>> | undefined,
    foodEvaluation: Awaited<ReturnType<FoodEvaluationConsultationService['evaluate']>> | undefined,
    recipeEvaluation?: RecipeEvaluationSource,
  ): string | undefined {
    if (foodResolution?.status === 'ambiguous') {
      const choices = foodResolution.clarification?.choices ?? foodResolution.candidates;
      const choiceText = choices
        .slice(0, 5)
        .map((candidate, index) => {
          const variant = candidate.variantLabel == null ? '' : ` — ${candidate.variantLabel}`;
          if (candidate.kind === 'approved-recipe') {
            const yieldText = candidate.recipeYieldServings == null ? '' : ` — ${candidate.recipeYieldServings} servings`;
            const ingredients = candidate.recipeIngredientNames?.length
              ? ` — ${candidate.recipeIngredientNames.join(', ')}`
              : '';
            return `${index + 1}. ${candidate.displayName}${yieldText}${ingredients}`;
          }
          return `${index + 1}. ${candidate.displayName}${variant} (food)`;
        })
        .join('\n');
      return `I found several possible foods. Which one did you mean?\n${choiceText}`;
    }
    if (foodResolution?.status === 'not-found') {
      return 'I could not find a confident match in the food catalog. Try a more specific food name or spelling.';
    }
    if (foodResolution?.status === 'resolved' && foodResolution.candidates[0]?.kind === 'approved-recipe') {
      const recipeName = foodResolution.candidates[0].displayName;
      if (recipeEvaluation == null) return `I found your recipe ${recipeName}, but it could not be evaluated right now.`;
      if (recipeEvaluation.evaluation.evaluationStatus === 'insufficient-evidence') return `I found your recipe ${recipeName}, but there is not enough reliable nutrition information to produce a compatibility score.`;
      return this.buildRecipeAnswer(question, recipeName, recipeEvaluation);
    }
    if (foodEvaluation != null) {
      const foodName = foodEvaluation.displayName;
      if (foodEvaluation.evaluation.evaluationStatus === 'insufficient-evidence') {
        return `I found ${foodName} using the ${foodEvaluation.serving.name} serving, but there is not enough reliable nutrition information to produce a compatibility score for this portion.`;
      }
      const hasPartialEvaluation = foodEvaluation.evaluation.coverage < 100 || foodEvaluation.evaluation.deferredPolicies.length > 0;
      const answer = this.buildFoodDirectAnswer(foodResolution?.query, foodEvaluation);
      const scoreSummary = hasPartialEvaluation
        ? `The numeric compatibility score for the guidance checked is ${foodEvaluation.evaluation.score}/100.`
        : `The compatibility score is ${foodEvaluation.evaluation.score}/100 based on the nutrition guidance currently available for your profile.`;
      const considerations = this.buildFoodConsiderations(foodEvaluation);
      const limitations = this.buildFoodLimitationGuidance(foodEvaluation);
      return hasPartialEvaluation
        ? [
            'I could only check part of the nutrition guidance for your profile.',
            ...considerations,
            ...limitations,
            this.buildPartialFoodCompatibilityAnswer(foodEvaluation),
            scoreSummary,
          ].join('\n\n')
        : [answer, ...considerations, scoreSummary, ...limitations].join('\n\n');
    }
    return undefined;
  }

  private buildRecipeAnswer(
    _question: string,
    recipeName: string,
    recipeEvaluation: RecipeEvaluationSource,
  ): string {
    const { evaluation } = recipeEvaluation;
    const partial = evaluation.coverage < 100 || evaluation.deferredPolicies.length > 0;
    const answer = evaluation.score >= 80
      ? `Based on the nutrition guidance NutriApp could evaluate, this serving of your ${recipeName} can fit within your current guidance.`
      : evaluation.score >= 50
        ? `Based on the nutrition guidance NutriApp could evaluate, this serving of your ${recipeName} may fit, but there are some nutrition trade-offs to consider.`
        : `Based on the nutrition guidance NutriApp could evaluate, this serving of your ${recipeName} does not fit all of the current guidance.`;
    const relevantNutrients = evaluation.contributions
      .filter(({ nutrient }) => ['potassium', 'phosphorus', 'sodium'].includes(nutrient))
      .slice(0, 3)
      .map(({ nutrient, amount, unit }) => `• ${this.formatFoodNutrient(nutrient)}: ${amount} ${unit ?? ''}`.trim())
      .join('\n');
    const limitations = evaluation.deferredPolicies
      .map((policy) => {
        if (policy.reason === 'missing-individualized-potassium-target') {
          return 'Personalized potassium limits are not configured, so potassium was not included in the compatibility score.';
        }
        if (policy.reason === 'missing-individualized-phosphorus-target') {
          return 'Personalized phosphorus limits are not configured, so phosphorus was not included in the compatibility score.';
        }
        return policy.explanation;
      })
      .filter((message, index, all) => all.indexOf(message) === index);
    const sections = partial
      ? [
          answer,
          `The check is incomplete because ${this.recipeLimitationSummary(limitations)}.`,
          relevantNutrients.length > 0 ? `This serving contains approximately:\n${relevantNutrients}` : '',
          limitations.length > 0 ? `Because those personalized limits are unavailable, NutriApp cannot confirm whether these amounts fit your individual limits.` : '',
          `The supporting compatibility score for the guidance checked is ${evaluation.score}/100.`,
        ]
      : [
          answer,
          relevantNutrients.length > 0 ? `This serving contains approximately:\n${relevantNutrients}` : '',
          `The compatibility score is ${evaluation.score}/100 based on the nutrition guidance currently available for your profile.`,
        ];
    return sections.filter(Boolean).join('\n\n');
  }

  private recipeLimitationSummary(limitations: readonly string[]): string {
    const nutrients = limitations
      .map((message) => message.match(/(potassium|phosphorus)/i)?.[1]?.toLowerCase())
      .filter((nutrient): nutrient is string => nutrient != null);
    const unique = [...new Set(nutrients)];
    if (unique.length === 0) return 'some personalized nutrition guidance is not available';
    if (unique.length === 1) return `a personalized ${unique[0]} limit is not configured`;
    return `personalized ${unique.join(' and ')} limits are not configured`;
  }

  private buildFoodDirectAnswer(
    question: string | undefined,
    foodEvaluation: NonNullable<Awaited<ReturnType<FoodEvaluationConsultationService['evaluate']>>>,
  ): string {
    const { evaluation } = foodEvaluation;
    const foodName = foodEvaluation.displayName;
    const asksWhetherToEat = /\b(?:can i|should i|is .*\b(?:good|okay|healthy|safe|appropriate)\b|appropriate)\b/i.test(question ?? '');

    let answer: string;
    if (evaluation.score >= 80) {
      answer = asksWhetherToEat
        ? `This serving of ${foodName} can fit within the nutrition guidance currently checked for your profile.`
        : `This serving of ${foodName} fits well within the nutrition guidance currently checked for your profile.`;
    } else if (evaluation.score >= 50) {
      answer = `This serving of ${foodName} may fit, but there are some nutrition trade-offs to consider.`;
    } else {
      answer = `This serving of ${foodName} does not fit all of the nutrition guidance currently checked for your profile.`;
    }

    const concerns = evaluation.reasons
      .filter(({ direction }) => direction === 'negative')
      .slice(0, 2)
      .map(({ nutrient }) => `One thing to keep in mind is ${this.formatFoodNutrient(nutrient)}; this serving is above your current guidance.`);

    return [answer, ...concerns].join(' ');
  }

  private buildPartialFoodCompatibilityAnswer(
    foodEvaluation: NonNullable<Awaited<ReturnType<FoodEvaluationConsultationService['evaluate']>>>,
  ): string {
    const { evaluation } = foodEvaluation;
    const foodName = foodEvaluation.displayName;
    const answer = evaluation.score >= 80
      ? `Within the guidance that was checked, this serving of ${foodName} appears compatible.`
      : evaluation.score >= 50
        ? `Within the guidance that was checked, this serving of ${foodName} may fit, but there are some nutrition trade-offs to consider.`
        : `Within the guidance that was checked, this serving of ${foodName} does not fit all of the current guidance.`;
    const concerns = evaluation.reasons
      .filter(({ direction }) => direction === 'negative')
      .slice(0, 2)
      .map(({ nutrient }) => `One thing to keep in mind is ${this.formatFoodNutrient(nutrient)}; this serving is above your current guidance.`);

    return [answer, ...concerns].join(' ');
  }

  private buildFoodConsiderations(
    foodEvaluation: NonNullable<Awaited<ReturnType<FoodEvaluationConsultationService['evaluate']>>>,
  ): readonly string[] {
    const { evaluation } = foodEvaluation;
    const insights = evaluation.nutritionInsights ?? [];
    const messages = insights.map((insight) => insight.message);

    const hasPotassiumLimitation = evaluation.deferredPolicies.some(
      ({ reason }) => reason === 'missing-individualized-potassium-target',
    );
    const hasPotassiumContribution = evaluation.contributions.some(({ nutrient }) => nutrient === 'potassium');

    if (!hasPotassiumContribution || hasPotassiumLimitation || insights.some(({ category }) => category === 'potassium')) return messages;
    const potassium = evaluation.contributions.find(({ nutrient }) => nutrient === 'potassium');
    return potassium == null
      ? messages
      : [...messages, `This serving contains ${potassium.amount} ${potassium.unit ?? 'mg'} of potassium. Because a personalized potassium target has not been configured, potassium could not be included when calculating this compatibility score.`];
  }

  private formatFoodNutrient(nutrient: string): string {
    const labels: Record<string, string> = {
      sodium: 'sodium',
      potassium: 'potassium',
      phosphorus: 'phosphorus',
      protein: 'protein',
      saturatedFat: 'saturated fat',
      carbohydrates: 'carbohydrates',
      fiber: 'fiber',
      addedSugar: 'added sugar',
      cholesterol: 'cholesterol',
    };
    return labels[nutrient] ?? nutrient.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  }

  private buildFoodLimitationGuidance(
    foodEvaluation: Awaited<ReturnType<FoodEvaluationConsultationService['evaluate']>>,
  ): readonly string[] {
    if (foodEvaluation == null) return [];

    const insightCategories = new Set((foodEvaluation.evaluation.nutritionInsights ?? []).map((insight) => insight.category));

    return foodEvaluation.evaluation.deferredPolicies.flatMap((deferredPolicy) => {
      if (deferredPolicy.reason === 'missing-individualized-potassium-target') {
        if (insightCategories.has('potassium')) return [];
        const potassium = foodEvaluation.evaluation.contributions.find(({ nutrient }) => nutrient === 'potassium');
        if (potassium != null) {
          return [`This serving contains ${potassium.amount} ${potassium.unit ?? 'mg'} of potassium. Because a personalized potassium target has not been configured, potassium could not be included when calculating this compatibility score. If your healthcare team has given you a potassium limit, use that guidance with this result.`];
        }
        return ['Potassium could not be included because a personalized potassium target has not been configured.'];
      }
      if (deferredPolicy.reason === 'missing-individualized-phosphorus-target') {
        if (insightCategories.has('phosphorus')) return [];
        const phosphorus = foodEvaluation.evaluation.contributions.find(({ nutrient }) => nutrient === 'phosphorus');
        return phosphorus == null
          ? ['Phosphorus could not be included because a personalized phosphorus target has not been configured.']
          : [`This serving contains ${phosphorus.amount} ${phosphorus.unit ?? 'mg'} of phosphorus. Because a personalized phosphorus target has not been configured, phosphorus could not be included when calculating this compatibility score.`];
      }
      return [deferredPolicy.explanation];
    });
  }

  private buildRecommendationSupplement(selected: RecommendationResolution['selected']): string {
    const applicableRecommendations = selected
      .filter((item) => item.category !== 'deferred-policy')
      .slice(0, 2)
      .map((item) => item.message);

    return applicableRecommendations.length === 0
      ? ''
      : renderGuidanceSections([{
        key: 'tips',
        title: 'Tips',
        items: applicableRecommendations,
      }]);
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
