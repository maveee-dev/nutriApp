import { RecommendationResolutionResponseDto } from '../../recommendations/dto/recommendation-response.dto.js';
import type { MealContextAvailability } from '../types/meal-context-availability.type.js';
import type { FoodResolutionCandidateDto, FoodResolutionDto } from '../types/food-resolution.dto.js';
import type { FoodConsultationEvaluation } from '../types/food-consultation-evaluation.type.js';
import type { LaboratoryNutritionInsightSource } from '../../../laboratory/sources/laboratory-analysis.source.js';
import type { RecipeEvaluationSource } from '../../recipes/types/recipe-evaluation.source.js';

export class ConsultationPendingClarificationDto {
  type!: 'food';
  originalQuestion!: string;
  choices!: readonly FoodResolutionCandidateDto[];
}

export class ConsultationLaboratoryEvidenceDto {
  id!: string;
  testCode!: string;
  value!: string;
  unit!: string;
  collectedAt!: string;
  status!: 'current' | 'stale' | 'recorded';
  source!: string;
  usedByPolicies!: readonly { policyId: string; version: string; explanation: string }[];
}

export class NutritionConsultationResponseDto {
  apiVersion!: string;
  assistantMode!: 'deterministic-evidence' | 'ai-assisted';
  aiAssisted?: boolean;
  aiProvider?: string;
  /** Optional AI explanation; deterministic answer and evidence remain authoritative. */
  aiExplanation?: string;
  question!: string;
  date!: string;
  intent!: string;
  mealContext!: MealContextAvailability;
  foodResolution?: FoodResolutionDto;
  /** Deterministic food evidence, present only for a confident food match. */
  foodEvaluation?: FoodConsultationEvaluation;
  /** Deterministic evaluation for a user's approved recipe, when requested. */
  recipeEvaluation?: RecipeEvaluationSource;
  /** Structured, short-lived continuation state for an unresolved food choice. */
  pendingClarification?: ConsultationPendingClarificationDto;
  answer!: string;
  recommendations!: RecommendationResolutionResponseDto;
  laboratoryEvidence!: readonly ConsultationLaboratoryEvidenceDto[];
  /** Optional latest laboratory-derived educational context. */
  laboratoryInsights?: readonly LaboratoryNutritionInsightSource[];
  limitations!: readonly string[];
}
