export class LaboratoryResultResponseDto {
  id!: string;
  testCode!: string;
  value!: string;
  unit!: string;
  referenceLow!: string | null;
  referenceHigh!: string | null;
  collectedAt!: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
