export class RecommendationEvidenceSourceDto { sourceType!: string; sourceId!: string; version?: string; evaluatorVersion?: string; policyVersion?: string; policySetFingerprint?: string; snapshotFingerprint?: string; snapshotVersion?: string; evaluatedAt?: string; }
export class RecommendationEvidenceDto { id!: string; kind!: string; source!: RecommendationEvidenceSourceDto; field!: string; value!: string | number | boolean | null; unit?: string; explanation!: string; limitation?: string; }
export class RecommendationPolicyReferenceDto { policyId!: string; version!: string; source?: string; }
export class RecommendationDto { id!: string; category!: string; disposition!: string; severity!: string; scope!: string; title!: string; message!: string; subject?: string; nutrient?: string; evidence!: readonly RecommendationEvidenceDto[]; policy!: RecommendationPolicyReferenceDto; limitations?: readonly string[]; actions?: readonly string[]; }
export class RecommendationSuppressionDto { candidateId!: string; reason!: string; comparedWith?: string; }
import { DailyAdherenceDto, MealAssessmentDto, NutritionPolicyDeferralDto, NutritionTargetProvenanceDto } from '../../analysis/dto/daily-nutrition-response.dto.js';

export class RecommendationEvaluationMetadataDto {
  evaluationMode?: 'current-recomputation' | 'historical-replay';
  evaluationStatus?: 'evaluated' | 'insufficient-evidence';
  coverage?: number;
  mealAssessments?: readonly MealAssessmentDto[];
  mealAssessmentsByDate?: readonly RecommendationEvaluationDayDto[];
  dailyAdherence?: DailyAdherenceDto;
  targetProvenance?: readonly NutritionTargetProvenanceDto[];
  dailyAdherenceByDate?: readonly RecommendationEvaluationDayDto[];
  deferredPolicies!: readonly NutritionPolicyDeferralDto[];
  snapshotIds!: readonly string[];
  evaluatorVersions!: readonly string[];
  policySetFingerprints!: readonly string[];
  snapshotFingerprints!: readonly string[];
  replayLimitations!: readonly string[];
}

export class RecommendationEvaluationDayDto {
  date!: string;
  mealAssessments?: readonly MealAssessmentDto[];
  dailyAdherence?: DailyAdherenceDto;
}

export class RecommendationResolutionResponseDto { apiVersion!: string; scope!: string; contextId!: string; asOf!: string; evaluationMode?: 'current-recomputation' | 'historical-replay'; evaluation?: RecommendationEvaluationMetadataDto; recommendations!: readonly RecommendationDto[]; suppressed!: readonly RecommendationSuppressionDto[]; }
export class CurrentMealRecommendationItemDto { mealItemId!: string; snapshotId!: string; resolution!: RecommendationResolutionResponseDto; }
export class CurrentMealRecommendationsResponseDto { apiVersion!: string; scope!: string; mealId!: string; items!: CurrentMealRecommendationItemDto[]; }
