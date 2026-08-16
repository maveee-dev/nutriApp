export const CONDITION_CODES = {
  CKD: 'ckd',
  HYPERTENSION: 'hypertension',
} as const;

export type ConditionCode = (typeof CONDITION_CODES)[keyof typeof CONDITION_CODES];

export function toConditionCode(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}
