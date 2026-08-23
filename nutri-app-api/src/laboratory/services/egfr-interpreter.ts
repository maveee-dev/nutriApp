import { InvalidLaboratoryUnitError } from '../errors/invalid-laboratory-unit.error.js';
import { InvalidLaboratoryValueError } from '../errors/invalid-laboratory-value.error.js';
import { UnsupportedLaboratoryTestError } from '../errors/unsupported-laboratory-test.error.js';
import { LaboratoryFindingSource } from '../sources/laboratory-finding.source.js';
import { LaboratoryResultSource } from '../sources/laboratory-result.source.js';
import { LABORATORY_TEST_CODES } from '../types/laboratory-test-code.js';

export const CANONICAL_EGFR_UNIT = 'mL/min/1.73m²';

export class EgfrInterpreter {
  interpret(result: LaboratoryResultSource): LaboratoryFindingSource | null {
    if (result.testCode !== LABORATORY_TEST_CODES.EGFR) {
      throw new UnsupportedLaboratoryTestError();
    }
    if (this.normalizeUnit(result.unit) !== CANONICAL_EGFR_UNIT.toLowerCase().replace('²', '2')) {
      throw new InvalidLaboratoryUnitError();
    }
    const numericValue = Number(result.value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      throw new InvalidLaboratoryValueError();
    }
    return {
      testCode: result.testCode,
      value: result.value,
      unit: CANONICAL_EGFR_UNIT,
      collectedAt: result.collectedAt,
      status: 'reported',
      explanation: 'eGFR result recorded for future clinical policy evaluation.',
    };
  }

  private normalizeUnit(unit: string): string {
    return unit.trim().toLowerCase().replace(/\s+/g, '').replace(/²/g, '2');
  }
}
