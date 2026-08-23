import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DiabetesCarbohydrateTargetSource } from '../types/diabetes-carbohydrate-target.type.js';

@Injectable()
export class DiabetesCarbohydrateTargetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<DiabetesCarbohydrateTargetSource | null> {
    const target = await this.prisma.diabetesCarbohydrateTarget.findUnique({ where: { userId } });
    if (!target) return null;
    return {
      userId: target.userId,
      targetGrams: target.targetGrams.toString(),
      approvalSource: target.approvalSource,
      sourceReference: target.sourceReference,
      approvedAt: target.approvedAt,
      expiresAt: target.expiresAt,
    };
  }
}
