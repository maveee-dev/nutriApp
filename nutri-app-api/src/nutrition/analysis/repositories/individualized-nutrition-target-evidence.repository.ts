import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  CreateIndividualizedNutritionTargetEvidenceInput,
  IndividualizedNutritionTargetEvidence,
} from '../types/individualized-nutrition-target-evidence.type.js';

@Injectable()
export class IndividualizedNutritionTargetEvidenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrentByUserId(userId: string, asOf = new Date()): Promise<IndividualizedNutritionTargetEvidence[]> {
    const rows = await this.prisma.individualizedNutritionTargetEvidence.findMany({
      where: {
        userId,
        effectiveAt: { lte: asOf },
        OR: [{ expiresAt: null }, { expiresAt: { gt: asOf } }],
      },
      orderBy: [{ nutrientKey: 'asc' }, { effectiveAt: 'desc' }, { approvedAt: 'desc' }, { version: 'desc' }, { id: 'asc' }],
    });
    const latest = new Map<string, IndividualizedNutritionTargetEvidence>();
    for (const row of rows) {
      if (!latest.has(row.nutrientKey)) latest.set(row.nutrientKey, {
        id: row.id,
        userId: row.userId,
        nutrientKey: row.nutrientKey,
        kind: row.kind === 'UPPER_LIMIT' ? 'upper-limit' : 'lower-target',
        targetValue: row.targetValue.toString(),
        unit: row.unit,
        approvalSource: row.approvalSource,
        sourceReference: row.sourceReference,
        effectiveAt: row.effectiveAt,
        approvedAt: row.approvedAt,
        expiresAt: row.expiresAt,
        version: row.version,
      });
    }
    return [...latest.values()].sort((left, right) => left.nutrientKey.localeCompare(right.nutrientKey));
  }

  /** Inserts a new immutable version. Updates are intentionally not exposed. */
  async create(input: CreateIndividualizedNutritionTargetEvidenceInput): Promise<IndividualizedNutritionTargetEvidence> {
    const row = await this.prisma.individualizedNutritionTargetEvidence.create({
      data: {
        userId: input.userId,
        nutrientKey: input.nutrientKey,
        kind: input.kind === 'upper-limit' ? 'UPPER_LIMIT' : 'LOWER_TARGET',
        targetValue: input.targetValue,
        unit: input.unit,
        approvalSource: input.approvalSource === 'CLINICIAN_APPROVED' ? 'CLINICIAN_APPROVED' : 'USER_APPROVED',
        sourceReference: input.sourceReference ?? null,
        effectiveAt: input.effectiveAt,
        approvedAt: input.approvedAt,
        expiresAt: input.expiresAt ?? null,
        version: input.version,
      },
    });
    return {
      id: row.id,
      userId: row.userId,
      nutrientKey: row.nutrientKey,
      kind: row.kind === 'UPPER_LIMIT' ? 'upper-limit' : 'lower-target',
      targetValue: row.targetValue.toString(),
      unit: row.unit,
      approvalSource: row.approvalSource,
      sourceReference: row.sourceReference,
      effectiveAt: row.effectiveAt,
      approvedAt: row.approvedAt,
      expiresAt: row.expiresAt,
      version: row.version,
    };
  }
}
