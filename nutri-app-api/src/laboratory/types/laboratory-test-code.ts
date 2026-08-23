export const LABORATORY_TEST_CODES = {
  EGFR: 'egfr',
  HBA1C: 'hba1c',
  TOTAL_CHOLESTEROL: 'total-cholesterol',
  LDL_CHOLESTEROL: 'ldl-cholesterol',
  HDL_CHOLESTEROL: 'hdl-cholesterol',
  TRIGLYCERIDES: 'triglycerides',
  POTASSIUM: 'potassium',
  PHOSPHORUS: 'phosphorus',
  HEMOGLOBIN: 'hemoglobin',
} as const;

export type LaboratoryTestCode =
  (typeof LABORATORY_TEST_CODES)[keyof typeof LABORATORY_TEST_CODES];
