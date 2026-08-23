import { InvalidLaboratoryUnitError } from '../errors/invalid-laboratory-unit.error.js';
import { InvalidLaboratoryValueError } from '../errors/invalid-laboratory-value.error.js';
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

  it('accepts the canonical Unicode unit and preserves the normalized unit', () => {
    expect(interpreter.interpret(result())).toEqual(expect.objectContaining({
      value: '42.5',
      unit: 'mL/min/1.73m²',
    }));
  });

  it.each(['mL/min/1.73m2', ' ml / min / 1.73 m² '])('accepts compatible normalized unit %s', (unit) => {
    expect(interpreter.interpret(result({ unit }))).toEqual(expect.objectContaining({ unit: 'mL/min/1.73m²' }));
  });

  it('rejects unsupported tests', () => {
    expect(() => interpreter.interpret(result({ testCode: 'creatinine' }))).toThrow(UnsupportedLaboratoryTestError);
  });

  it('rejects incompatible units', () => {
    expect(() => interpreter.interpret(result({ unit: 'mg/dL' }))).toThrow(InvalidLaboratoryUnitError);
  });

  it.each(['0', '-1', 'not-a-number'])('rejects invalid eGFR value %s', (value) => {
    expect(() => interpreter.interpret(result({ value }))).toThrow(InvalidLaboratoryValueError);
  });
});
