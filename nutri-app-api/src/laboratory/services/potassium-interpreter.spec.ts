import { PotassiumInterpreter } from './potassium-interpreter.js';

describe('PotassiumInterpreter', () => {
  const interpreter = new PotassiumInterpreter();
  const result = (overrides: Partial<{ testCode: string; value: string; unit: string }> = {}) => ({
    id: 'lab-1', userId: 'user-1', testCode: 'potassium', value: '5.1', unit: 'mmol/L',
    referenceLow: null, referenceHigh: null, collectedAt: new Date('2026-08-20T00:00:00Z'),
    createdAt: new Date('2026-08-20T00:00:00Z'), updatedAt: new Date('2026-08-20T00:00:00Z'), ...overrides,
  });

  it('normalizes canonical and equivalent serum potassium units', () => {
    expect(interpreter.interpret(result({ unit: 'mEq/L' }))).toEqual(expect.objectContaining({ unit: 'mmol/L', value: '5.1' }));
  });

  it('rejects invalid units and values', () => {
    expect(() => interpreter.interpret(result({ unit: 'mg/dL' }))).toThrow();
    expect(() => interpreter.interpret(result({ value: 'not-a-number' }))).toThrow();
  });
});
