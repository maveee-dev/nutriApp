import { Injectable } from '@nestjs/common';
import { EgfrInterpreter } from './egfr-interpreter.js';
import { PotassiumInterpreter } from './potassium-interpreter.js';
import { PhosphorusInterpreter } from './phosphorus-interpreter.js';
import { LaboratoryFindingSource } from '../sources/laboratory-finding.source.js';
import { LaboratoryResultSource } from '../sources/laboratory-result.source.js';
import { LABORATORY_TEST_CODES } from '../types/laboratory-test-code.js';
import { UnsupportedLaboratoryTestError } from '../errors/unsupported-laboratory-test.error.js';

/**
 * Normalizes supported laboratory records without interpreting clinical meaning.
 * Policy-specific interpretation remains owned by the consuming policy.
 */
@Injectable()
export class LaboratoryInterpreter {
  constructor(
    private readonly egfrInterpreter: EgfrInterpreter,
    private readonly potassiumInterpreter: PotassiumInterpreter = new PotassiumInterpreter(),
    private readonly phosphorusInterpreter: PhosphorusInterpreter = new PhosphorusInterpreter(),
  ) {}

  interpret(result: LaboratoryResultSource): LaboratoryFindingSource | null {
    if (result.testCode === LABORATORY_TEST_CODES.EGFR) return this.egfrInterpreter.interpret(result);
    if (result.testCode === LABORATORY_TEST_CODES.POTASSIUM) return this.potassiumInterpreter.interpret(result);
    if (result.testCode === LABORATORY_TEST_CODES.PHOSPHORUS) return this.phosphorusInterpreter.interpret(result);
    if (!Object.values(LABORATORY_TEST_CODES).includes(result.testCode as typeof LABORATORY_TEST_CODES[keyof typeof LABORATORY_TEST_CODES])) {
      throw new UnsupportedLaboratoryTestError();
    }
    return {
      testCode: result.testCode,
      value: result.value,
      unit: result.unit,
      collectedAt: result.collectedAt,
      status: 'reported',
      explanation: `${result.testCode} result recorded as evidence for future approved nutrition policy evaluation. No clinical interpretation is applied by the laboratory layer.`,
    };
  }
}
