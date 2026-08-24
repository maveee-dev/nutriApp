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
  readonly displayName: string;
  readonly evaluationStatus: string;
  readonly compatibilityScore: number | null;
  readonly coverage: number | null;
  readonly reasons: readonly {
    readonly nutrient?: string;
    readonly direction?: string;
    readonly explanation: string;
  }[];
  readonly contributions: readonly {
    readonly nutrient: string;
    readonly amount: string;
    readonly unit?: string;
    readonly targetPercentage?: number | null;
  }[];
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
  readonly userConditions: readonly string[];
  readonly labSummary: readonly ConsultationPromptLaboratoryEvidence[];
  readonly foodEvaluation: ConsultationPromptFoodEvaluation | null;
  readonly dailySummary: ConsultationPromptDailySummary;
  readonly recommendations: readonly ConsultationPromptRecommendation[];
  readonly userQuestion: string;
  readonly conversation: readonly ConsultationPromptConversationTurn[];
}
