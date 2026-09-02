export interface LaboratoryReportResultSource {
  readonly id: string;
  readonly reportId: string | null;
  readonly userId: string;
  readonly testCode: string;
  readonly testName: string | null;
  readonly value: string;
  readonly unit: string;
  readonly referenceLow: string | null;
  readonly referenceHigh: string | null;
  readonly flag: string | null;
  readonly collectedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface LaboratoryReportSource {
  readonly id: string;
  readonly userId: string;
  readonly reportDate: Date;
  readonly source: string;
  readonly createdAt: Date;
  readonly results: readonly LaboratoryReportResultSource[];
}
