import { Injectable } from '@nestjs/common';
import { LaboratoryResultSource } from '../sources/laboratory-result.source.js';
import { CreateLaboratoryResultInput } from '../types/create-laboratory-result.input.js';
import { FindLaboratoryResultsInput } from '../types/find-laboratory-results.input.js';
import { LaboratoryResultsRepository } from '../repositories/laboratory-results.repository.js';
import { EgfrInterpreter } from './egfr-interpreter.js';
import { LaboratoryFindingSource } from '../sources/laboratory-finding.source.js';

@Injectable()
export class LaboratoryResultsService {
  constructor(
    private readonly repository: LaboratoryResultsRepository,
    private readonly interpreter: EgfrInterpreter,
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
    const results = await this.repository.findMany(userId, { testCode: 'egfr' });
    for (const result of results) {
      try {
        return this.interpreter.interpret(result);
      } catch {
        // Ignore invalid laboratory entries and continue to the next latest result.
      }
    }
    return null;
  }
}
