import { NutritionInsightService } from './nutrition-insight.service.js';

describe('NutritionInsightService', () => {
  const service = new NutritionInsightService();

  it('projects potassium context without creating a target or changing evaluation data', () => {
    const evaluation = {
      score: 100,
      coverage: 53.33,
      reasons: [],
      contributions: [{
        nutrient: 'potassium',
        unit: 'mg',
        amount: '375',
        targetValue: null,
        currentDailyValue: null,
        explanation: 'Potassium contribution.',
      }],
      deferredPolicies: [{
        policyId: 'ckd-potassium-v1',
        reason: 'missing-individualized-potassium-target',
        explanation: 'Potassium was not included in this score.',
      }],
    } as const;

    const result = service.generate({ evaluation, conditionCodes: ['ckd'] });

    expect(result).toEqual([{
      category: 'potassium',
      severity: 'information',
      title: 'Potassium information',
      message: 'This serving contains approximately 375 mg of potassium. Because no personalized potassium target is configured, NutriApp cannot determine whether this amount fits your individual daily allowance.',
      evidence: { nutrient: 'potassium', amount: '375', unit: 'mg' },
    }]);
    expect(evaluation.score).toBe(100);
    expect(evaluation.deferredPolicies[0]?.reason).toBe('missing-individualized-potassium-target');
  });

  it('projects phosphorus and fiber in deterministic order', () => {
    const result = service.generate({
      evaluation: {
        score: 80,
        coverage: 100,
        reasons: [],
        contributions: [
          { nutrient: 'fiber', unit: 'g', amount: '4', targetValue: '28', currentDailyValue: null, explanation: 'Fiber.' },
          { nutrient: 'phosphorus', unit: 'mg', amount: '210', targetValue: null, currentDailyValue: null, explanation: 'Phosphorus.' },
        ],
        deferredPolicies: [{
          policyId: 'ckd-phosphorus-v1',
          reason: 'missing-individualized-phosphorus-target',
          explanation: 'Phosphorus was not included in this score.',
        }],
      },
    });

    expect(result).toEqual([
      {
        category: 'phosphorus',
        severity: 'information',
        title: 'Phosphorus information',
        message: 'This serving contains approximately 210 mg of phosphorus. Because no personalized phosphorus target is configured, NutriApp cannot determine whether this amount fits your individual daily allowance.',
        evidence: { nutrient: 'phosphorus', amount: '210', unit: 'mg' },
      },
      {
        category: 'fiber',
        severity: 'positive',
        title: 'Fiber contribution',
        message: 'This serving contributes approximately 4 g of dietary fiber, which supports digestive health.',
        evidence: { nutrient: 'fiber', amount: '4', unit: 'g' },
      },
    ]);
  });

  it('does not emit a low-sodium label when the contribution is not a small share of the current guidance', () => {
    const result = service.generate({
      evaluation: {
        score: 80,
        coverage: 100,
        reasons: [],
        contributions: [{ nutrient: 'sodium', unit: 'mg', amount: '300', targetValue: '2300', currentDailyValue: null, explanation: 'Sodium.' }],
        deferredPolicies: [],
      },
    });

    expect(result).toEqual([]);
  });

  it('does not infer a nutrient insight from zero, invalid, or missing amounts', () => {
    const result = service.generate({
      evaluation: {
        score: 0,
        coverage: 0,
        reasons: [],
        contributions: [
          { nutrient: 'potassium', amount: '0', targetValue: null, currentDailyValue: null, explanation: '' },
          { nutrient: 'phosphorus', amount: 'not-a-number', targetValue: null, currentDailyValue: null, explanation: '' },
        ],
        deferredPolicies: [],
      },
    });

    expect(result).toEqual([]);
  });
});

