import { describe, expect, it } from 'vitest';
import { deferralGuidance } from './deferralGuidance';

const deferral = (reason: string) => ({ policyId: 'test-policy-v1', reason, explanation: 'More evidence is needed.' });

describe('deferralGuidance', () => {
  it('deep-links laboratory deferrals to the requested test workflow', () => {
    expect(deferralGuidance(deferral('missing-egfr')).action).toEqual({
      label: 'Add eGFR result',
      to: '/health?addLab=egfr#laboratory-results',
    });
    expect(deferralGuidance(deferral('stale-potassium')).action?.to).toBe('/health?addLab=potassium#laboratory-results');
    expect(deferralGuidance(deferral('invalid-phosphorus-unit')).action?.to).toBe('/health?addLab=phosphorus#laboratory-results');
  });

  it('deep-links profile and dialysis evidence to the exact section', () => {
    expect(deferralGuidance(deferral('missing-weight')).action?.to).toBe('/health#physical-metrics');
    expect(deferralGuidance(deferral('missing-dialysis-status')).action?.to).toBe('/health#dialysis-status');
  });

  it('routes users to the target screen for review of personalized targets', () => {
    const guidance = deferralGuidance(deferral('missing-individualized-phosphorus-target'));
    expect(guidance.action).toEqual({ label: 'Review phosphorus target', to: '/nutrition-targets' });
    expect(guidance.supportingText).toMatch(/healthcare team/i);
  });

  it('routes modality corrections to the dialysis workflow', () => {
    const guidance = deferralGuidance(deferral('missing-dialysis-modality'));
    expect(guidance.action).toEqual({
      label: 'Confirm dialysis type',
      to: '/health#dialysis-status',
    });
    expect(guidance.supportingText).toMatch(/hemodialysis or peritoneal dialysis/i);
  });
});
