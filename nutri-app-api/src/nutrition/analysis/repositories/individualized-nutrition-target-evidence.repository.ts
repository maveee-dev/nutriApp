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
      if (!latest.has(row.nutrientKey)) latest.set(row.nutrientKey, this.toSource(row));
    }
    return [...latest.values()]
      .filter((target) => target.approvalStatus === 'APPROVED' && target.kind !== 'range' && target.targetValue != null)
      .sort((left, right) => left.nutrientKey.localeCompare(right.nutrientKey));
  }

  /** Returns the latest version for each nutrient for user-facing management views. */
  async findLatestByUserId(userId: string, asOf = new Date()): Promise<IndividualizedNutritionTargetEvidence[]> {
    const rows = await this.prisma.individualizedNutritionTargetEvidence.findMany({
      where: { userId, effectiveAt: { lte: asOf } },
      orderBy: [{ nutrientKey: 'asc' }, { effectiveAt: 'desc' }, { version: 'desc' }, { id: 'asc' }],
    });
    const latest = new Map<string, IndividualizedNutritionTargetEvidence>();
    for (const row of rows) if (!latest.has(row.nutrientKey)) latest.set(row.nutrientKey, this.toSource(row));
    return [...latest.values()].sort((left, right) => left.nutrientKey.localeCompare(right.nutrientKey));
  }

  async findByUserId(userId: string): Promise<IndividualizedNutritionTargetEvidence[]> {
    const rows = await this.prisma.individualizedNutritionTargetEvidence.findMany({
      where: { userId },
      orderBy: [{ nutrientKey: 'asc' }, { version: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toSource(row));
  }

  async findByIdForUser(userId: string, id: string): Promise<IndividualizedNutritionTargetEvidence | null> {
    const row = await this.prisma.individualizedNutritionTargetEvidence.findFirst({ where: { id, userId } });
    return row == null ? null : this.toSource(row);
  }

  async nextVersion(userId: string, nutrientKey: string): Promise<number> {
    const result = await this.prisma.individualizedNutritionTargetEvidence.aggregate({
      where: { userId, nutrientKey },
      _max: { version: true },
    });
    return (result._max.version ?? 0) + 1;
  }

  /** Inserts a new immutable version. Updates are intentionally not exposed. */
  async create(input: CreateIndividualizedNutritionTargetEvidenceInput): Promise<IndividualizedNutritionTargetEvidence> {
    const row = await this.prisma.individualizedNutritionTargetEvidence.create({
      data: {
        userId: input.userId,
        nutrientKey: input.nutrientKey,
        kind: input.kind === 'upper-limit' ? 'UPPER_LIMIT' : input.kind === 'range' ? 'RANGE' : 'LOWER_TARGET',
        targetValue: input.targetValue ?? null,
        unit: input.unit,
        approvalSource: input.approvalSource as 'USER_APPROVED' | 'CLINICIAN_APPROVED' | 'SYSTEM_SUGGESTED' | 'IMPORTED',
        approvalStatus: input.approvalStatus ?? 'APPROVED',
        sourceReference: input.sourceReference ?? null,
        effectiveAt: input.effectiveAt,
        approvedAt: input.approvedAt,
        expiresAt: input.expiresAt ?? null,
        version: input.version,
        rangeMin: input.rangeMin ?? null,
        rangeMax: input.rangeMax ?? null,
        notes: input.notes ?? null,
      },
    });
    return this.toSource(row);
  }

  private toSource(row: {
    id: string;
    userId: string;
    nutrientKey: string;
    kind: 'UPPER_LIMIT' | 'LOWER_TARGET' | 'RANGE';
    targetValue: { toString(): string } | null;
    unit: string;
    approvalSource: string;
    approvalStatus: 'SUGGESTED' | 'APPROVED' | 'DISMISSED';
    sourceReference: string | null;
    effectiveAt: Date;
    approvedAt: Date;
    expiresAt: Date | null;
    version: number;
    rangeMin: { toString(): string } | null;
    rangeMax: { toString(): string } | null;
    notes: string | null;
  }): IndividualizedNutritionTargetEvidence {
    return {
      id: row.id,
      userId: row.userId,
      nutrientKey: row.nutrientKey,
      kind: row.kind === 'UPPER_LIMIT' ? 'upper-limit' : row.kind === 'RANGE' ? 'range' : 'lower-target',
      targetValue: row.targetValue?.toString() ?? null,
      unit: row.unit,
      approvalSource: row.approvalSource,
      approvalStatus: row.approvalStatus,
      sourceReference: row.sourceReference,
      effectiveAt: row.effectiveAt,
      approvedAt: row.approvedAt,
      expiresAt: row.expiresAt,
      version: row.version,
      rangeMin: row.rangeMin?.toString() ?? null,
      rangeMax: row.rangeMax?.toString() ?? null,
      notes: row.notes,
    };
  }
}
