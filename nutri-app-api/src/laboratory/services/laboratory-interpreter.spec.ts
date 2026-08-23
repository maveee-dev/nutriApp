import { LaboratoryInterpreter } from './laboratory-interpreter.js';
import { EgfrInterpreter } from './egfr-interpreter.js';

describe('LaboratoryInterpreter', () => {
  const interpreter = new LaboratoryInterpreter(new EgfrInterpreter());

  it('records supported planned analytes without interpreting them', () => {
    const finding = interpreter.interpret({
      id: 'lab-1', userId: 'user-1', testCode: 'hba1c', value: '6.2', unit: '%',
      referenceLow: null, referenceHigh: null, collectedAt: new Date('2026-08-18T00:00:00.000Z'), createdAt: new Date(),
    });
    expect(finding).toMatchObject({ testCode: 'hba1c', value: '6.2', unit: '%', status: 'reported' });
    expect(finding?.explanation).toContain('No clinical interpretation');
  });
});
