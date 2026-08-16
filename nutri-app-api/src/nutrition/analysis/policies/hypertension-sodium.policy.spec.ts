import { HypertensionSodiumPolicy } from './hypertension-sodium.policy.js';

describe('HypertensionSodiumPolicy', () => {
  it('returns the existing sodium target without an adjustment when hypertension is absent', () => {
    expect(new HypertensionSodiumPolicy().calculate([], '2300')).toEqual({
      sodiumMilligrams: '2300',
      adjustment: null,
    });
  });

  it('applies the approved hypertension sodium policy', () => {
    expect(new HypertensionSodiumPolicy().calculate(['hypertension'], '2300')).toEqual({
      sodiumMilligrams: '1500',
      adjustment: expect.objectContaining({
        from: '2300',
        to: '1500',
        reasonCode: 'hypertension-sodium-limit',
      }),
    });
  });

  it('derives the explanation from the supplied baseline', () => {
    expect(new HypertensionSodiumPolicy().calculate(['hypertension'], '2100').adjustment?.explanation).toContain(
      'from 2100 mg/day to 1500 mg/day',
    );
  });
});
