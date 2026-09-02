export class LaboratoryNutritionInsightDto {
  category!: string;
  severity!: 'information';
  title!: string;
  message!: string;
  evidence!: {
    testCode: string;
    value: string;
    unit: string;
    status: 'low' | 'normal' | 'high' | 'unknown';
  };
}

export class LaboratoryResultAnalysisDto {
  id!: string;
  reportId!: string | null;
  testCode!: string;
  testName!: string;
  value!: string;
  unit!: string;
  referenceLow!: string | null;
  referenceHigh!: string | null;
  flag!: string | null;
  status!: 'low' | 'normal' | 'high' | 'unknown';
  message!: string;
  reportDate!: string;
}

export class LaboratoryReportResponseDto {
  id!: string;
  reportDate!: string;
  source!: string;
  createdAt!: string;
  results!: LaboratoryResultAnalysisDto[];
  nutritionInsights!: LaboratoryNutritionInsightDto[];
  ignoredTestCodes!: string[];
}

export class LaboratoryTrendPointDto {
  resultId!: string;
  reportDate!: string;
  value!: string;
  unit!: string;
  status!: 'low' | 'normal' | 'high' | 'unknown';
}

export class LaboratoryTrendDto {
  testCode!: string;
  testName!: string;
  direction!: 'improving' | 'worsening' | 'stable' | 'insufficient-history';
  latest!: LaboratoryTrendPointDto;
  previous!: LaboratoryTrendPointDto | null;
  points!: LaboratoryTrendPointDto[];
}

export class LaboratoryLatestResponseDto {
  results!: LaboratoryResultAnalysisDto[];
  nutritionInsights!: LaboratoryNutritionInsightDto[];
}
