import { RecommendationResolutionResponseDto } from '../../recommendations/dto/recommendation-response.dto.js';

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
  question!: string;
  date!: string;
  intent!: string;
  answer!: string;
  recommendations!: RecommendationResolutionResponseDto;
  laboratoryEvidence!: readonly ConsultationLaboratoryEvidenceDto[];
  limitations!: readonly string[];
}
