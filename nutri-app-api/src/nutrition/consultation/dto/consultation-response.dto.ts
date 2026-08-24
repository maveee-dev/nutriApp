import { RecommendationResolutionResponseDto } from '../../recommendations/dto/recommendation-response.dto.js';
import type { MealContextAvailability } from '../types/meal-context-availability.type.js';
import type { FoodResolutionDto } from '../types/food-resolution.dto.js';
import type { FoodConsultationEvaluation } from '../types/food-consultation-evaluation.type.js';

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
  answer!: string;
  recommendations!: RecommendationResolutionResponseDto;
  laboratoryEvidence!: readonly ConsultationLaboratoryEvidenceDto[];
  limitations!: readonly string[];
}
