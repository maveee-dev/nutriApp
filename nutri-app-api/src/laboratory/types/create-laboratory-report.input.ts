export interface CreateLaboratoryReportResultInput {
  readonly testCode: string;
  readonly testName?: string;
  readonly value: string;
  readonly unit: string;
  readonly referenceLow?: string;
  readonly referenceHigh?: string;
  readonly flag?: string;
}

export interface CreateLaboratoryReportInput {
  readonly reportDate: Date;
  readonly source?: string;
  readonly results: readonly CreateLaboratoryReportResultInput[];
}
