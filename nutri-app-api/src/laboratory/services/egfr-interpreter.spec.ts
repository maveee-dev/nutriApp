import { InvalidLaboratoryUnitError } from '../errors/invalid-laboratory-unit.error.js';
import { UnsupportedLaboratoryTestError } from '../errors/unsupported-laboratory-test.error.js';
import { LaboratoryResultSource } from '../sources/laboratory-result.source.js';
import { EgfrInterpreter } from './egfr-interpreter.js';

const result = (overrides: Partial<LaboratoryResultSource> = {}): LaboratoryResultSource => ({
  id: 'result-1',
  userId: 'user-1',
  testCode: 'egfr',
  value: '42.5',
  unit: 'mL/min/1.73m²',
  referenceLow: null,
  referenceHigh: null,
  collectedAt: new Date('2026-08-13T00:00:00.000Z'),
  createdAt: new Date('2026-08-13T01:00:00.000Z'),
  updatedAt: new Date('2026-08-13T01:00:00.000Z'),
  ...overrides,
});

describe('EgfrInterpreter', () => {
  const interpreter = new EgfrInterpreter();

  it('returns a neutral reported finding while preserving value and timestamp', () => {
    expect(interpreter.interpret(result())).toEqual({
      testCode: 'egfr',
      value: '42.5',
      unit: 'mL/min/1.73m²',
      collectedAt: new Date('2026-08-13T00:00:00.000Z'),
      status: 'reported',
      explanation: 'eGFR result recorded for future clinical policy evaluation.',
    });
  });

  it('rejects unsupported tests', () => {
    expect(() => interpreter.interpret(result({ testCode: 'creatinine' }))).toThrow(
      UnsupportedLaboratoryTestError,
    );
  });

  it('rejects an incompatible unit', () => {
    expect(() => interpreter.interpret(result({ unit: 'mg/dL' }))).toThrow(
      InvalidLaboratoryUnitError,
    );
  });
});
