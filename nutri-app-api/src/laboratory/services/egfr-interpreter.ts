import { InvalidLaboratoryUnitError } from '../errors/invalid-laboratory-unit.error.js';
import { UnsupportedLaboratoryTestError } from '../errors/unsupported-laboratory-test.error.js';
import { LaboratoryFindingSource } from '../sources/laboratory-finding.source.js';
import { LaboratoryResultSource } from '../sources/laboratory-result.source.js';
import { LABORATORY_TEST_CODES } from '../types/laboratory-test-code.js';

const EGFR_UNIT = 'mL/min/1.73m²';

export class EgfrInterpreter {
  interpret(result: LaboratoryResultSource): LaboratoryFindingSource | null {
    if (result.testCode !== LABORATORY_TEST_CODES.EGFR) {
      throw new UnsupportedLaboratoryTestError();
    }
    if (result.unit !== EGFR_UNIT) {
      throw new InvalidLaboratoryUnitError();
    }
    return {
      testCode: result.testCode,
      value: result.value,
      unit: result.unit,
      collectedAt: result.collectedAt,
      status: 'reported',
      explanation: 'eGFR result recorded for future clinical policy evaluation.',
    };
  }
}
