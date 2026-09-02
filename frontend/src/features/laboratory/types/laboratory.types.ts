export type LaboratoryResultStatus = 'low' | 'normal' | 'high' | 'unknown';
export type LaboratoryTrendDirection = 'improving' | 'worsening' | 'stable' | 'insufficient-history';

export interface LaboratoryNutritionInsight {
  category: string;
  severity: 'information';
  title: string;
  message: string;
  evidence: { testCode: string; value: string; unit: string; status: LaboratoryResultStatus };
}

export interface LaboratoryResultAnalysis {
  id: string;
  reportId: string | null;
  testCode: string;
  testName: string;
  value: string;
  unit: string;
  referenceLow: string | null;
  referenceHigh: string | null;
  flag: string | null;
  status: LaboratoryResultStatus;
  message: string;
  reportDate: string;
}

export interface LaboratoryReport {
  id: string;
  reportDate: string;
  source: string;
  createdAt: string;
  results: LaboratoryResultAnalysis[];
  nutritionInsights: LaboratoryNutritionInsight[];
  ignoredTestCodes: string[];
}

export interface LaboratoryTrendPoint {
  resultId: string;
  reportDate: string;
  value: string;
  unit: string;
  status: LaboratoryResultStatus;
}

export interface LaboratoryTrend {
  testCode: string;
  testName: string;
  direction: LaboratoryTrendDirection;
  latest: LaboratoryTrendPoint;
  previous: LaboratoryTrendPoint | null;
  points: LaboratoryTrendPoint[];
}

export interface LaboratoryLatest {
  results: LaboratoryResultAnalysis[];
  nutritionInsights: LaboratoryNutritionInsight[];
}

export interface CreateLaboratoryReportRequest {
  reportDate: string;
  source?: string;
  results: Array<{
    testCode: string;
    value: string;
    unit: string;
    referenceLow?: string;
    referenceHigh?: string;
    testName?: string;
    flag?: string;
  }>;
}

export const LABORATORY_TESTS = [
  { code: 'creatinine', label: 'Creatinine', unit: 'mg/dL' },
  { code: 'egfr', label: 'eGFR', unit: 'mL/min/1.73m2' },
  { code: 'bun', label: 'BUN', unit: 'mg/dL' },
  { code: 'potassium', label: 'Potassium', unit: 'mmol/L' },
  { code: 'sodium', label: 'Sodium', unit: 'mmol/L' },
  { code: 'calcium', label: 'Calcium', unit: 'mg/dL' },
  { code: 'phosphorus', label: 'Phosphorus', unit: 'mg/dL' },
  { code: 'hba1c', label: 'HbA1c', unit: '%' },
  { code: 'fasting-blood-sugar', label: 'Fasting Blood Sugar', unit: 'mg/dL' },
  { code: 'total-cholesterol', label: 'Total Cholesterol', unit: 'mg/dL' },
  { code: 'ldl-cholesterol', label: 'LDL Cholesterol', unit: 'mg/dL' },
  { code: 'hdl-cholesterol', label: 'HDL Cholesterol', unit: 'mg/dL' },
  { code: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL' },
  { code: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL' },
  { code: 'hematocrit', label: 'Hematocrit', unit: '%' },
] as const;

export type LaboratoryTestCode = (typeof LABORATORY_TESTS)[number]['code'];
