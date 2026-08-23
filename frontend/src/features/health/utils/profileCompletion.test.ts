import { describe, expect, it } from 'vitest';
import { buildProfileCompletionItems } from './profileCompletion';

describe('buildProfileCompletionItems', () => {
  it('lists missing core profile fields as actionable items', () => {
    const items = buildProfileCompletionItems({
      profile: null,
      conditionCount: 0,
      dialysisStatus: null,
      laboratoryResults: [],
      deferredPolicies: [],
    });

    expect(items.filter((item) => item.status === 'attention').map((item) => item.id)).toEqual(['age', 'sex', 'height', 'weight']);
    expect(items.find((item) => item.id === 'weight')?.action?.to).toBe('/health#physical-metrics');
  });

  it('uses active deferrals to identify required dialysis and laboratory evidence', () => {
    const items = buildProfileCompletionItems({
      profile: { age: 40, sex: 'MALE', heightCm: 170, weightKg: 70 } as never,
      conditionCount: 1,
      dialysisStatus: null,
      laboratoryResults: [],
      deferredPolicies: [
        { policyId: 'ckd-v1', reason: 'missing-dialysis-status', explanation: 'Dialysis status is required.' },
        { policyId: 'ckd-v1', reason: 'missing-egfr', explanation: 'A current eGFR result is required.' },
      ],
    });

    expect(items.find((item) => item.id === 'dialysis')).toMatchObject({ status: 'attention' });
    expect(items.find((item) => item.id === 'lab-egfr')).toMatchObject({ status: 'attention' });
  });

  it('does not treat an empty condition list as a clinical failure', () => {
    const items = buildProfileCompletionItems({
      profile: { age: 40, sex: 'MALE', heightCm: 170, weightKg: 70 } as never,
      conditionCount: 0,
      dialysisStatus: null,
      laboratoryResults: [],
      deferredPolicies: [],
    });

    expect(items.find((item) => item.id === 'conditions')).toMatchObject({ status: 'informational' });
  });

  it('does not make dialysis status an action for users without dialysis guidance', () => {
    const items = buildProfileCompletionItems({
      profile: { age: 40, sex: 'MALE', heightCm: 170, weightKg: 70 } as never,
      conditionCount: 0,
      dialysisStatus: null,
      laboratoryResults: [],
      deferredPolicies: [],
    });

    expect(items.find((item) => item.id === 'dialysis')).toMatchObject({
      status: 'informational',
      action: undefined,
    });
  });
});
