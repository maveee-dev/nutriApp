import { createHash } from 'node:crypto';

export const NUTRITION_POLICY_SET_VERSION = 'nutrition-policy-set-v1';

export interface NutritionPolicySetEntry {
  readonly policyId: string;
  readonly version: string;
}

export function createNutritionPolicySetFingerprint(entries: readonly NutritionPolicySetEntry[]): string {
  const canonical = [...entries]
    .sort((left, right) => `${left.policyId}:${left.version}`.localeCompare(`${right.policyId}:${right.version}`))
    .map((entry) => `${entry.policyId}:${entry.version}`)
    .join('|');
  return `sha256:${createHash('sha256').update(`${NUTRITION_POLICY_SET_VERSION}|${canonical}`, 'utf8').digest('hex')}`;
}

export function createNutritionSnapshotFingerprint(input: {
  readonly evaluatorVersion: string;
  readonly policySetFingerprint: string;
  readonly snapshotVersion: string;
}): string {
  return `sha256:${createHash('sha256').update(`${input.evaluatorVersion}|${input.policySetFingerprint}|${input.snapshotVersion}`, 'utf8').digest('hex')}`;
}
