import { FoodEvaluationResponseMapper } from './food-evaluation-response.mapper.js';

describe('FoodEvaluationResponseMapper characterization', () => {
  it('preserves the current additive evaluation DTO contract', () => {
    const response = FoodEvaluationResponseMapper.toResponseDto({
      score: 87,
      evaluationStatus: 'evaluated',
      coverage: 100,
      reasons: [{
        code: 'sodium-contribution',
        direction: 'neutral',
        nutrient: 'sodium',
        measuredValue: '120',
        targetValue: '2300',
        explanation: 'Within the current limit.',
      }],
      contributions: [{
        nutrient: 'protein',
        unit: 'g',
        amount: '10',
        targetValue: '64',
        currentDailyValue: null,
        explanation: 'Protein contribution.',
      }],
      deferredPolicies: [],
    });

    expect(response).toEqual({
      score: 87,
      evaluationStatus: 'evaluated',
      coverage: 100,
      reasons: [{
        code: 'sodium-contribution',
        direction: 'neutral',
        nutrient: 'sodium',
        measuredValue: '120',
        targetValue: '2300',
        explanation: 'Within the current limit.',
      }],
      contributions: [{
        nutrient: 'protein',
        unit: 'g',
        amount: '10',
        targetValue: '64',
        currentDailyValue: null,
        explanation: 'Protein contribution.',
      }],
      deferredPolicies: [],
    });
  });

  it('keeps insufficient evidence distinct from a low evaluated score', () => {
    const response = FoodEvaluationResponseMapper.toResponseDto({
      score: 0,
      evaluationStatus: 'insufficient-evidence',
      coverage: 0,
      reasons: [],
      contributions: [],
      deferredPolicies: [],
    });

    expect(response).toEqual({
      score: 0,
      evaluationStatus: 'insufficient-evidence',
      coverage: 0,
      reasons: [],
      contributions: [],
      deferredPolicies: [],
    });
  });

  it('preserves informational deferrals for the Food Evaluation API', () => {
    const response = FoodEvaluationResponseMapper.toResponseDto({
      score: 100,
      evaluationStatus: 'evaluated',
      coverage: 100,
      reasons: [],
      contributions: [{
        nutrient: 'potassium',
        unit: 'mg',
        amount: '422',
        targetValue: null,
        currentDailyValue: null,
        explanation: 'This portion provides 422 mg of potassium.',
      }],
      deferredPolicies: [{
        policyId: 'ckd-potassium-v1',
        reason: 'missing-individualized-potassium-target',
        explanation: 'Potassium was not included in this compatibility score.',
      }],
    });

    expect(response.deferredPolicies).toEqual([{
      policyId: 'ckd-potassium-v1',
      reason: 'missing-individualized-potassium-target',
      explanation: 'Potassium was not included in this compatibility score.',
    }]);
    expect(response.score).toBe(100);
  });

  it('maps additive nutrition insights without changing existing evaluation fields', () => {
    const response = FoodEvaluationResponseMapper.toResponseDto({
      score: 100,
      evaluationStatus: 'evaluated',
      coverage: 53.33,
      reasons: [],
      contributions: [],
      deferredPolicies: [],
      nutritionInsights: [{
        category: 'potassium',
        severity: 'information',
        title: 'Potassium information',
        message: 'This serving contains approximately 375 mg of potassium.',
        evidence: { nutrient: 'potassium', amount: '375', unit: 'mg' },
      }],
    });

    expect(response.nutritionInsights).toEqual([{
      category: 'potassium',
      severity: 'information',
      title: 'Potassium information',
      message: 'This serving contains approximately 375 mg of potassium.',
      evidence: { nutrient: 'potassium', amount: '375', unit: 'mg' },
    }]);
    expect(response.score).toBe(100);
    expect(response.coverage).toBe(53.33);
  });
});
