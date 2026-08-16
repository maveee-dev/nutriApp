export interface LaboratoryResultSource {
  readonly id: string;
  readonly userId: string;
  readonly testCode: string;
  readonly value: string;
  readonly unit: string;
  readonly referenceLow: string | null;
  readonly referenceHigh: string | null;
  readonly collectedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
