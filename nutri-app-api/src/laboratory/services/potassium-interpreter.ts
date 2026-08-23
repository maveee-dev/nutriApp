import { InvalidLaboratoryUnitError } from '../errors/invalid-laboratory-unit.error.js';
import { InvalidLaboratoryValueError } from '../errors/invalid-laboratory-value.error.js';
import { UnsupportedLaboratoryTestError } from '../errors/unsupported-laboratory-test.error.js';
import { LaboratoryFindingSource } from '../sources/laboratory-finding.source.js';
import { LaboratoryResultSource } from '../sources/laboratory-result.source.js';
import { LABORATORY_TEST_CODES } from '../types/laboratory-test-code.js';

export const CANONICAL_POTASSIUM_UNIT = 'mmol/L';

export class PotassiumInterpreter {
  interpret(result: LaboratoryResultSource): LaboratoryFindingSource | null {
    if (result.testCode !== LABORATORY_TEST_CODES.POTASSIUM) throw new UnsupportedLaboratoryTestError();
    if (!this.normalizeUnit(result.unit).includes('mmol/l')) throw new InvalidLaboratoryUnitError();
    const numericValue = Number(result.value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) throw new InvalidLaboratoryValueError();
    return {
      testCode: result.testCode,
      value: result.value,
      unit: CANONICAL_POTASSIUM_UNIT,
      collectedAt: result.collectedAt,
      status: 'reported',
      explanation: 'Serum potassium result recorded as evidence for the approved CKD potassium policy.',
    };
  }

  private normalizeUnit(unit: string): string {
    return unit.trim().toLowerCase().replace(/\s+/g, '').replace('meq/l', 'mmol/l');
  }
}
