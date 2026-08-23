import { PhosphorusInterpreter } from './phosphorus-interpreter.js';

describe('PhosphorusInterpreter', () => {
  const interpreter = new PhosphorusInterpreter();
  const result = (overrides: Partial<{ testCode: string; value: string; unit: string }> = {}) => ({
    id: 'lab-1', userId: 'user-1', testCode: 'phosphorus', value: '4.5', unit: 'mg/dL',
    referenceLow: null, referenceHigh: null, collectedAt: new Date('2026-08-20T00:00:00Z'),
    createdAt: new Date('2026-08-20T00:00:00Z'), updatedAt: new Date('2026-08-20T00:00:00Z'), ...overrides,
  });

  it('accepts canonical phosphorus units and normalizes mmol/L', () => {
    expect(interpreter.interpret(result())).toEqual(expect.objectContaining({ unit: 'mg/dL', value: '4.5' }));
    expect(interpreter.interpret(result({ unit: 'mmol/L', value: '1.452' }))).toEqual(expect.objectContaining({ unit: 'mg/dL', value: '4.496844' }));
  });

  it('rejects unsupported units and invalid values', () => {
    expect(() => interpreter.interpret(result({ unit: 'mg/L' }))).toThrow();
    expect(() => interpreter.interpret(result({ value: 'not-a-number' }))).toThrow();
  });
});
