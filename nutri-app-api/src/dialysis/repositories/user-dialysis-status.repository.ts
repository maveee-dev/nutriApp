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
    const reportedAt = new Date();
    const status = await this.prisma.userDialysisStatus.upsert({
      where: { userId },
      create: {
        userId,
        status: input.status,
        modality: input.modality ?? DialysisModality.UNKNOWN,
        frequency: input.frequency ?? null,
        schedule: input.schedule ?? null,
        effectiveAt: input.effectiveAt,
        reportedAt,
      },
      update: {
        status: input.status,
        effectiveAt: input.effectiveAt,
        // An omitted modality means "leave the reported modality unchanged".
        // UNKNOWN remains available when callers explicitly submit it.
        ...(input.modality == null ? {} : { modality: input.modality }),
        ...(input.frequency === undefined ? {} : { frequency: input.frequency }),
        ...(input.schedule === undefined ? {} : { schedule: input.schedule }),
        // The endpoint is a new user report, so its freshness must advance
        // even when the status or modality value is unchanged.
        reportedAt,
      },
    });
    return UserDialysisStatusRepositoryMapper.toSource(status);
  }
}
