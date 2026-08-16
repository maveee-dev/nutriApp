export const LABORATORY_TEST_CODES = {
  EGFR: 'egfr',
} as const;

export type LaboratoryTestCode =
  (typeof LABORATORY_TEST_CODES)[keyof typeof LABORATORY_TEST_CODES];
