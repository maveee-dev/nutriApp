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

export interface NutritionConsultationResponse {
  apiVersion: string;
  assistantMode: 'deterministic-evidence' | 'ai-assisted';
  aiAssisted?: boolean;
  aiProvider?: string;
  question: string;
  date: string;
  intent: string;
  answer: string;
  recommendations: RecommendationResolution;
  laboratoryEvidence: ConsultationLaboratoryEvidence[];
  limitations: string[];
}

export interface NutritionConsultationConversationTurn { role: 'user' | 'assistant'; content: string; }
export interface NutritionConsultationRequest { question: string; date?: string; conversation?: NutritionConsultationConversationTurn[]; }
