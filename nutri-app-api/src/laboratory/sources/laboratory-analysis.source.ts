export type LaboratoryResultStatus = 'low' | 'normal' | 'high' | 'unknown';
export type LaboratoryTrendDirection = 'improving' | 'worsening' | 'stable' | 'insufficient-history';

export interface LaboratoryNutritionInsightSource {
  readonly category: string;
  readonly severity: 'information';
  readonly title: string;
  readonly message: string;
  readonly evidence: {
    readonly testCode: string;
    readonly value: string;
    readonly unit: string;
    readonly status: LaboratoryResultStatus;
  };
}

export interface LaboratoryResultAnalysisSource {
  readonly id: string;
  readonly reportId: string | null;
  readonly testCode: string;
  readonly testName: string;
  readonly value: string;
  readonly unit: string;
  readonly referenceLow: string | null;
  readonly referenceHigh: string | null;
  readonly flag: string | null;
  readonly status: LaboratoryResultStatus;
  readonly message: string;
  readonly reportDate: Date;
}

export interface LaboratoryReportAnalysisSource {
  readonly id: string;
  readonly reportDate: Date;
  readonly source: string;
  readonly createdAt: Date;
  readonly results: readonly LaboratoryResultAnalysisSource[];
  readonly nutritionInsights: readonly LaboratoryNutritionInsightSource[];
  readonly ignoredTestCodes: readonly string[];
}

export interface LaboratoryTrendPointSource {
  readonly resultId: string;
  readonly reportDate: Date;
  readonly value: string;
  readonly unit: string;
  readonly status: LaboratoryResultStatus;
}

export interface LaboratoryTrendSource {
  readonly testCode: string;
  readonly testName: string;
  readonly direction: LaboratoryTrendDirection;
  readonly latest: LaboratoryTrendPointSource;
  readonly previous: LaboratoryTrendPointSource | null;
  readonly points: readonly LaboratoryTrendPointSource[];
}

export interface LaboratoryLatestSource {
  readonly results: readonly LaboratoryResultAnalysisSource[];
  readonly nutritionInsights: readonly LaboratoryNutritionInsightSource[];
}
