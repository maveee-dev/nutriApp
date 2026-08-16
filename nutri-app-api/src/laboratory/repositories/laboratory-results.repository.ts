import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateLaboratoryResultInput } from '../types/create-laboratory-result.input.js';
import { FindLaboratoryResultsInput } from '../types/find-laboratory-results.input.js';
import { LaboratoryResultSource } from '../sources/laboratory-result.source.js';
import { LaboratoryResultRepositoryMapper } from '../mappers/repository/laboratory-result-repository.mapper.js';

@Injectable()
export class LaboratoryResultsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    input: CreateLaboratoryResultInput,
  ): Promise<LaboratoryResultSource> {
    const result = await this.prisma.laboratoryResult.create({
      data: {
        userId,
        testCode: input.testCode,
        value: input.value,
        unit: input.unit,
        referenceLow: input.referenceLow,
        referenceHigh: input.referenceHigh,
        collectedAt: input.collectedAt,
      },
    });
    return LaboratoryResultRepositoryMapper.toSource(result);
  }

  async findMany(
    userId: string,
    input: FindLaboratoryResultsInput,
  ): Promise<LaboratoryResultSource[]> {
    const results = await this.prisma.laboratoryResult.findMany({
      where: { userId, ...(input.testCode ? { testCode: input.testCode } : {}) },
      orderBy: { collectedAt: 'desc' },
    });
    return results.map(LaboratoryResultRepositoryMapper.toSource);
  }
}
