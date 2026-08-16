export interface CreateLaboratoryResultInput {
  readonly testCode: string;
  readonly value: string;
  readonly unit: string;
  readonly referenceLow?: string;
  readonly referenceHigh?: string;
  readonly collectedAt: Date;
}
