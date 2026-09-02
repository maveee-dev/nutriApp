import { Injectable } from '@nestjs/common';
import { LaboratoryResultSource } from '../sources/laboratory-result.source.js';
import { CreateLaboratoryResultInput } from '../types/create-laboratory-result.input.js';
import { FindLaboratoryResultsInput } from '../types/find-laboratory-results.input.js';
import { LaboratoryResultsRepository } from '../repositories/laboratory-results.repository.js';
import { LaboratoryInterpreter } from './laboratory-interpreter.js';
import { LaboratoryFindingSource } from '../sources/laboratory-finding.source.js';
import { EgfrEvidenceFailureReason, EgfrEvidenceResolution } from '../sources/egfr-evidence-resolution.source.js';
import { InvalidLaboratoryUnitError } from '../errors/invalid-laboratory-unit.error.js';
import { InvalidLaboratoryValueError } from '../errors/invalid-laboratory-value.error.js';
import { PotassiumEvidenceResolution, PotassiumEvidenceFailureReason } from '../sources/potassium-evidence-resolution.source.js';
import { PhosphorusEvidenceResolution, PhosphorusEvidenceFailureReason } from '../sources/phosphorus-evidence-resolution.source.js';

@Injectable()
export class LaboratoryResultsService {
  constructor(
    private readonly repository: LaboratoryResultsRepository,
    private readonly interpreter: LaboratoryInterpreter,
  ) {}

  create(userId: string, input: CreateLaboratoryResultInput): Promise<LaboratoryResultSource> {
    return this.repository.create(userId, input);
  }

  findMany(userId: string, input: FindLaboratoryResultsInput): Promise<LaboratoryResultSource[]> {
    return this.repository.findMany(userId, input);
  }

  interpret(result: LaboratoryResultSource) {
    return this.interpreter.interpret(result);
  }

  async findLatestEgfr(userId: string): Promise<LaboratoryFindingSource | null> {
    return (await this.findLatestEgfrEvidence(userId)).finding;
  }

  async findLatestEgfrEvidence(userId: string): Promise<EgfrEvidenceResolution> {
    const results = await this.repository.findMany(userId, { testCode: 'egfr' });
    let failureReason: EgfrEvidenceFailureReason | null = results.length === 0 ? 'no-egfr-found' : null;
    let failureExplanation: string | null = results.length === 0 ? 'No eGFR laboratory result was found for this user.' : null;
    for (const result of results) {
      try {
        return { finding: this.interpreter.interpret(result), failureReason: null, failureExplanation: null };
      } catch (error) {
        if (error instanceof InvalidLaboratoryUnitError) {
          if (failureReason == null || failureReason === 'no-egfr-found') {
            failureReason = 'invalid-egfr-unit';
            failureExplanation = 'The latest eGFR result uses an unsupported unit.';
          }
        } else if (error instanceof InvalidLaboratoryValueError) {
          if (failureReason == null || failureReason === 'no-egfr-found') {
            failureReason = 'invalid-egfr-value';
            failureExplanation = 'The latest eGFR result contains an invalid numeric value.';
          }
        }
        // Ignore invalid laboratory entries and continue to the next latest result.
      }
    }
    return { finding: null, failureReason, failureExplanation };
  }

  async findLatestPotassiumEvidence(userId: string): Promise<PotassiumEvidenceResolution> {
    const results = await this.repository.findMany(userId, { testCode: 'potassium' });
    let failureReason: PotassiumEvidenceFailureReason | null = results.length === 0 ? 'no-potassium-found' : null;
    let failureExplanation: string | null = results.length === 0 ? 'No serum potassium laboratory result was found for this user.' : null;
    for (const result of results) {
      try {
        return { finding: this.interpreter.interpret(result), failureReason: null, failureExplanation: null };
      } catch (error) {
        if (error instanceof InvalidLaboratoryUnitError) {
          if (failureReason == null || failureReason === 'no-potassium-found') {
            failureReason = 'invalid-potassium-unit';
            failureExplanation = 'The latest serum potassium result uses an unsupported unit.';
          }
        } else if (error instanceof InvalidLaboratoryValueError) {
          if (failureReason == null || failureReason === 'no-potassium-found') {
            failureReason = 'invalid-potassium-value';
            failureExplanation = 'The latest serum potassium result contains an invalid numeric value.';
          }
        }
      }
    }
    return { finding: null, failureReason, failureExplanation };
  }

  async findLatestPhosphorusEvidence(userId: string): Promise<PhosphorusEvidenceResolution> {
    const results = await this.repository.findMany(userId, { testCode: 'phosphorus' });
    let failureReason: PhosphorusEvidenceFailureReason | null = results.length === 0 ? 'no-phosphorus-found' : null;
    let failureExplanation: string | null = results.length === 0 ? 'No serum phosphorus laboratory result was found for this user.' : null;
    for (const result of results) {
      try {
        return { finding: this.interpreter.interpret(result), failureReason: null, failureExplanation: null };
      } catch (error) {
        if (error instanceof InvalidLaboratoryUnitError) {
          if (failureReason == null || failureReason === 'no-phosphorus-found') {
            failureReason = 'invalid-phosphorus-unit';
            failureExplanation = 'The latest serum phosphorus result uses an unsupported unit.';
          }
        } else if (error instanceof InvalidLaboratoryValueError) {
          if (failureReason == null || failureReason === 'no-phosphorus-found') {
            failureReason = 'invalid-phosphorus-value';
            failureExplanation = 'The latest serum phosphorus result contains an invalid numeric value.';
          }
        }
      }
    }
    return { finding: null, failureReason, failureExplanation };
  }
}
