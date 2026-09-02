export interface ConsultationPromptConversationTurn {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface ConsultationPromptLaboratoryEvidence {
  readonly testCode: string;
  readonly value: string;
  readonly unit: string;
  readonly collectedAt: string;
  readonly status: 'current' | 'stale' | 'recorded';
  readonly usedByPolicies: readonly string[];
}

export interface ConsultationPromptFoodEvaluation {
  readonly foodId: string;
  readonly displayName: string;
  readonly variantLabel: string | null;
  readonly serving: {
    readonly name: string;
    readonly grams: string;
    readonly quantity: string;
  };
  readonly evaluationStatus: string;
  readonly compatibilityScore: number | null;
  readonly coverage: number | null;
  readonly reasons: readonly {
    readonly nutrient?: string;
    readonly direction?: string;
    readonly measuredValue?: string;
    readonly targetValue?: string | null;
    readonly explanation: string;
  }[];
  readonly contributions: readonly {
    readonly nutrient: string;
    readonly amount: string;
    readonly unit?: string;
    readonly targetValue?: string | null;
    readonly currentDailyValue?: string | null;
    readonly explanation: string;
  }[];
  readonly targets: NutritionTargets;
  readonly deferredPolicies: readonly {
    readonly policyId: string;
    readonly reason: string;
    readonly explanation: string;
  }[];
  readonly nutritionInsights?: readonly {
    readonly category: string;
    readonly severity: string;
    readonly title: string;
    readonly message: string;
    readonly evidence: {
      readonly nutrient: string;
      readonly amount: string;
      readonly unit: string;
    };
  }[];
  readonly targetProvenance: readonly ConsultationPromptTargetProvenance[];
  readonly policySetFingerprint: string | null;
}

export interface ConsultationPromptTargetProvenance {
  readonly target: string;
  readonly policyId: string;
  readonly source: string;
  readonly sourceUrl?: string;
  readonly sourceVersion?: string;
  readonly version: string;
  readonly explanation: string;
  readonly applicability?: {
    readonly context: string;
    readonly conditionCode: string;
    readonly dialysisStatus: string | null;
    readonly laboratory?: {
      readonly testCode: string;
      readonly value: string;
      readonly unit: string;
      readonly collectedAt: string;
    };
  };
  readonly evidence?: {
    readonly evidenceId?: string;
    readonly evidenceVersion?: number;
    readonly approvalSource: string;
    readonly sourceReference: string | null;
    readonly effectiveAt?: string;
    readonly approvedAt: string;
    readonly expiresAt: string | null;
  };
}

export interface ConsultationPromptDailySummary {
  readonly date: string;
  readonly evaluationMode?: 'current-recomputation' | 'historical-replay';
  readonly evaluationStatus?: string;
  readonly coverage?: number;
  readonly deferredPolicies: readonly {
    readonly policyId: string;
    readonly reason: string;
    readonly explanation: string;
  }[];
  readonly adherence: readonly {
    readonly measurementKey: string;
    readonly status: string;
    readonly targetValue: string | null;
    readonly consumedValue: string | null;
    readonly remainingValue: string | null;
    readonly exceededValue: string | null;
    readonly coveragePercentage: number | null;
  }[];
  readonly replayLimitations: readonly string[];
  readonly targetProvenance?: readonly ConsultationPromptTargetProvenance[];
  readonly snapshotIds?: readonly string[];
  readonly evaluatorVersions?: readonly string[];
  readonly policySetFingerprints?: readonly string[];
}

export interface ConsultationPromptRecommendation {
  readonly category: string;
  readonly disposition: string;
  readonly severity: string;
  readonly scope: string;
  readonly title: string;
  readonly message: string;
  readonly nutrient?: string;
  readonly evidence: readonly {
    readonly field: string;
    readonly value: string | number | boolean | null;
    readonly unit?: string;
    readonly explanation: string;
  }[];
}

/** Structured, allowlisted data supplied to an AI provider. */
export interface ConsultationPrompt {
  /** Consultation lane/intent used to tailor explanation style only. */
  readonly consultationType?: string;
  readonly userConditions: readonly string[];
  readonly labSummary: readonly ConsultationPromptLaboratoryEvidence[];
  readonly foodEvaluation: ConsultationPromptFoodEvaluation | null;
  readonly dailySummary: ConsultationPromptDailySummary;
  readonly recommendations: readonly ConsultationPromptRecommendation[];
  readonly userQuestion: string;
  readonly conversation: readonly ConsultationPromptConversationTurn[];
}
import type { NutritionTargets } from '../../nutrition/analysis/types/nutrition-targets.type.js';
