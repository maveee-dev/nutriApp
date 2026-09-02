export const LABORATORY_TEST_CODES = {
  CREATININE: 'creatinine',
  EGFR: 'egfr',
  BUN: 'bun',
  SODIUM: 'sodium',
  HBA1C: 'hba1c',
  FASTING_BLOOD_SUGAR: 'fasting-blood-sugar',
  CALCIUM: 'calcium',
  TOTAL_CHOLESTEROL: 'total-cholesterol',
  LDL_CHOLESTEROL: 'ldl-cholesterol',
  HDL_CHOLESTEROL: 'hdl-cholesterol',
  TRIGLYCERIDES: 'triglycerides',
  POTASSIUM: 'potassium',
  PHOSPHORUS: 'phosphorus',
  HEMOGLOBIN: 'hemoglobin',
  HEMATOCRIT: 'hematocrit',
} as const;

export type LaboratoryTestCode =
  (typeof LABORATORY_TEST_CODES)[keyof typeof LABORATORY_TEST_CODES];

export const LABORATORY_TEST_DEFINITIONS: Readonly<Record<LaboratoryTestCode, {
  readonly label: string;
  readonly panel: 'kidney' | 'electrolytes' | 'diabetes' | 'lipids' | 'cbc';
}>> = {
  creatinine: { label: 'Creatinine', panel: 'kidney' },
  egfr: { label: 'eGFR', panel: 'kidney' },
  bun: { label: 'BUN', panel: 'kidney' },
  sodium: { label: 'Sodium', panel: 'electrolytes' },
  potassium: { label: 'Potassium', panel: 'electrolytes' },
  calcium: { label: 'Calcium', panel: 'electrolytes' },
  phosphorus: { label: 'Phosphorus', panel: 'electrolytes' },
  hba1c: { label: 'HbA1c', panel: 'diabetes' },
  'fasting-blood-sugar': { label: 'Fasting Blood Sugar', panel: 'diabetes' },
  'total-cholesterol': { label: 'Total Cholesterol', panel: 'lipids' },
  'ldl-cholesterol': { label: 'LDL Cholesterol', panel: 'lipids' },
  'hdl-cholesterol': { label: 'HDL Cholesterol', panel: 'lipids' },
  triglycerides: { label: 'Triglycerides', panel: 'lipids' },
  hemoglobin: { label: 'Hemoglobin', panel: 'cbc' },
  hematocrit: { label: 'Hematocrit', panel: 'cbc' },
};

export const SUPPORTED_LABORATORY_TEST_CODES = Object.keys(LABORATORY_TEST_DEFINITIONS) as LaboratoryTestCode[];
