import type { RecommendationResolution } from '@/features/dashboard/types/dashboard.types';

export interface ConsultationLaboratoryEvidence {
  id: string;
  testCode: string;
  value: string;
  unit: string;
  collectedAt: string;
  status: 'current' | 'stale' | 'recorded';
  source: string;
  usedByPolicies: { policyId: string; version: string; explanation: string }[];
}

export interface ConsultationLaboratoryInsight {
  category: string;
  severity: 'information';
  title: string;
  message: string;
  evidence: { testCode: string; value: string; unit: string; status: 'low' | 'normal' | 'high' | 'unknown' };
}

export interface NutritionConsultationClarificationChoice {
  stableId?: string;
  foodId?: string;
  recipeId?: string;
  recipeVersionId?: string;
  kind: 'food' | 'approved-recipe';
  displayName: string;
  variantLabel?: string | null;
  recipeYieldServings?: string;
  recipeIngredientNames?: string[];
  matchType: string;
  confidence: 'high' | 'medium';
}

export interface NutritionConsultationPendingClarification {
  type: 'food';
  originalQuestion: string;
  choices: NutritionConsultationClarificationChoice[];
}

export interface NutritionConsultationResponse {
  apiVersion: string;
  assistantMode: 'deterministic-evidence' | 'ai-assisted';
  aiAssisted?: boolean;
  aiProvider?: string;
  aiExplanation?: string;
  question: string;
  date: string;
  intent: string;
  answer: string;
  pendingClarification?: NutritionConsultationPendingClarification;
  recommendations: RecommendationResolution;
  laboratoryEvidence: ConsultationLaboratoryEvidence[];
  laboratoryInsights?: ConsultationLaboratoryInsight[];
  limitations: string[];
}

export interface NutritionConsultationConversationTurn { role: 'user' | 'assistant'; content: string; }
export interface NutritionConsultationClarificationSelection {
  type: 'food';
  originalQuestion: string;
  selectedStableId: string;
}
export interface NutritionConsultationRequest {
  question: string;
  date?: string;
  conversation?: NutritionConsultationConversationTurn[];
  clarificationSelection?: NutritionConsultationClarificationSelection;
}
