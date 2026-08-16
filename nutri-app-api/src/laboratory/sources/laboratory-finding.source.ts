export interface LaboratoryFindingSource {
  readonly testCode: string;
  readonly value: string;
  readonly unit: string;
  readonly collectedAt: Date;
  readonly status: 'reported';
  readonly explanation: string;
}
