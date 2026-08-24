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
});
