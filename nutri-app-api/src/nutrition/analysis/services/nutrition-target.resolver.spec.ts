import { NutritionTargetResolver } from './nutrition-target.resolver.js';

describe('NutritionTargetResolver', () => {
  it('selects the higher-precedence dialysis target and suppresses lower-precedence CKD deferrals', () => {
    const resolver = new NutritionTargetResolver();
    const result = resolver.resolve([
      {
        candidateId: 'general-nutrition-sodium-v1:sodiumMilligrams',
        target: 'sodiumMilligrams', value: '2300', conflictKey: 'nutrition-target:sodiumMilligrams:daily-upper-limit',
        policyId: 'general-nutrition-sodium-v1', policyVersion: 'v1', precedence: 10, specificity: 1, order: 0,
      },
      {
        candidateId: 'general-protein-baseline-v1:proteinGrams',
        target: 'proteinGrams', value: '56', conflictKey: 'nutrition-target:proteinGrams:daily-lower-limit',
        policyId: 'general-protein-baseline-v1', policyVersion: 'v1', precedence: 5, specificity: 1, order: 1,
      },
      {
        candidateId: 'hemodialysis-protein-v1:proteinGrams',
        target: 'proteinGrams', value: '70', conflictKey: 'nutrition-target:proteinGrams:daily-lower-limit',
        policyId: 'hemodialysis-protein-v1', policyVersion: 'v1', precedence: 30, specificity: 3, order: 2,
      },
    ], [
      { policyId: 'ckd-non-dialysis-protein-v1', reason: 'dialysis-policy-pending', explanation: 'CKD baseline is not applicable.', conflictKey: 'nutrition-target:proteinGrams:daily-lower-limit', precedence: 20 },
    ]);

    expect(result.targets.proteinGrams).toBe('70');
    expect(result.deferredPolicies).toEqual([]);
  });

  it('retains only the most specific unresolved deferral for a conflict dimension', () => {
    const resolver = new NutritionTargetResolver();
    const result = resolver.resolve([{
      candidateId: 'general-nutrition-sodium-v1:sodiumMilligrams', target: 'sodiumMilligrams', value: '2300', conflictKey: 'sodium',
      policyId: 'general-nutrition-sodium-v1', policyVersion: 'v1', precedence: 10, specificity: 1, order: 1,
    }], [
      { policyId: 'ckd-non-dialysis-protein-v1', reason: 'missing-egfr', explanation: 'eGFR is required.', conflictKey: 'protein', precedence: 20 },
      { policyId: 'hemodialysis-protein-v1', reason: 'missing-modality', explanation: 'Modality is required.', conflictKey: 'protein', precedence: 30 },
    ]);

    expect(result.deferredPolicies).toEqual([{ policyId: 'hemodialysis-protein-v1', reason: 'missing-modality', explanation: 'Modality is required.' }]);
  });

  it('preserves distinct provenance records from the same policy version', () => {
    const resolver = new NutritionTargetResolver();
    const result = resolver.resolve([{
      candidateId: 'general-nutrition-sodium-v1:sodiumMilligrams', target: 'sodiumMilligrams', value: '2300', conflictKey: 'sodium',
      policyId: 'general-nutrition-sodium-v1', policyVersion: 'v1', precedence: 10, specificity: 1, order: 1,
      provenance: { target: 'sodiumMilligrams', policyId: 'general-nutrition-sodium-v1', version: 'v1', source: 'FDA', explanation: 'baseline' },
      supportingProvenance: [{ target: 'sodiumMilligrams', policyId: 'general-nutrition-sodium-v1', version: 'v1', source: 'DGA', explanation: 'supporting' }],
    }], []);

    expect(result.targetProvenance).toHaveLength(2);
  });
});
