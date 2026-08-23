import { Decimal } from 'decimal.js';
import { InvalidLaboratoryUnitError } from '../errors/invalid-laboratory-unit.error.js';
import { InvalidLaboratoryValueError } from '../errors/invalid-laboratory-value.error.js';
import { UnsupportedLaboratoryTestError } from '../errors/unsupported-laboratory-test.error.js';
import { LaboratoryFindingSource } from '../sources/laboratory-finding.source.js';
import { LaboratoryResultSource } from '../sources/laboratory-result.source.js';
import { LABORATORY_TEST_CODES } from '../types/laboratory-test-code.js';

export const CANONICAL_PHOSPHORUS_UNIT = 'mg/dL';
const MMOL_PER_L_TO_MG_PER_DL = new Decimal('3.097');

export class PhosphorusInterpreter {
  interpret(result: LaboratoryResultSource): LaboratoryFindingSource | null {
    if (result.testCode !== LABORATORY_TEST_CODES.PHOSPHORUS) throw new UnsupportedLaboratoryTestError();

    const unit = this.normalizeUnit(result.unit);
    const numericValue = new Decimal(result.value);
    if (!numericValue.isFinite() || numericValue.lte(0)) throw new InvalidLaboratoryValueError();

    if (unit === 'mg/dl') {
      return this.finding(result, numericValue.toString());
    }
    if (unit === 'mmol/l') {
      return this.finding(result, numericValue.mul(MMOL_PER_L_TO_MG_PER_DL).toDecimalPlaces(6).toString());
    }
    throw new InvalidLaboratoryUnitError();
  }

  private finding(result: LaboratoryResultSource, value: string): LaboratoryFindingSource {
    return {
      testCode: result.testCode,
      value,
      unit: CANONICAL_PHOSPHORUS_UNIT,
      collectedAt: result.collectedAt,
      status: 'reported',
      explanation: 'Serum phosphorus result recorded as evidence for the approved CKD phosphorus policy.',
    };
  }

  private normalizeUnit(unit: string): string {
    return unit.trim().toLowerCase().replace(/\s+/g, '');
  }
}
