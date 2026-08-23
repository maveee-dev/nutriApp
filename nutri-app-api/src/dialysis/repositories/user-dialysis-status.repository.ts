import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserDialysisStatusSource } from '../sources/user-dialysis-status.source.js';
import { UpdateDialysisStatusInput } from '../types/update-dialysis-status.input.js';
import { DialysisModality } from '../../../generated/prisma/client.js';
import { UserDialysisStatusRepositoryMapper } from '../mappers/repository/user-dialysis-status-repository.mapper.js';

@Injectable()
export class UserDialysisStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserDialysisStatusSource | null> {
    const status = await this.prisma.userDialysisStatus.findUnique({ where: { userId } });
    return status ? UserDialysisStatusRepositoryMapper.toSource(status) : null;
  }

  async upsert(
    userId: string,
    input: UpdateDialysisStatusInput,
  ): Promise<UserDialysisStatusSource> {
    const status = await this.prisma.userDialysisStatus.upsert({
      where: { userId },
      create: {
        userId,
        status: input.status,
        modality: input.modality ?? DialysisModality.UNKNOWN,
        effectiveAt: input.effectiveAt,
      },
      update: {
        status: input.status,
        modality: input.modality ?? DialysisModality.UNKNOWN,
        effectiveAt: input.effectiveAt,
      },
    });
    return UserDialysisStatusRepositoryMapper.toSource(status);
  }
}
