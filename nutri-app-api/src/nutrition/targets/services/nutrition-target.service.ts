import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { NUTRITION_TARGET_DESCRIPTORS } from '../../analysis/types/nutrition-target-descriptor.js';
import { IndividualizedNutritionTargetEvidenceRepository } from '../../analysis/repositories/individualized-nutrition-target-evidence.repository.js';
import type { IndividualizedNutritionTargetEvidence } from '../../analysis/types/individualized-nutrition-target-evidence.type.js';
import {
  NUTRITION_TARGET_APPROVAL_STATUSES,
  NUTRITION_TARGET_KINDS,
  NUTRITION_TARGET_SOURCES,
  type CreateNutritionTargetInput,
  type NutritionTargetApprovalStatus,
  type NutritionTargetKind,
  type NutritionTargetManagementSource,
  type NutritionTargetSource,
  type UpdateNutritionTargetInput,
} from '../types/nutrition-target-management.type.js';

const UNIT_BY_NUTRIENT: Record<string, string> = {
  sodiumMilligrams: 'mg/day',
  proteinGrams: 'g/day',
  saturatedFatGrams: 'g/day',
  addedSugarGrams: 'g/day',
  cholesterolMilligrams: 'mg/day',
  fiberGrams: 'g/day',
  carbohydrateGrams: 'g/day',
  potassiumMilligrams: 'mg/day',
  phosphorusMilligrams: 'mg/day',
  caloriesKcal: 'kcal/day',
};

@Injectable()
export class NutritionTargetService {
  constructor(private readonly repository: IndividualizedNutritionTargetEvidenceRepository) {}

  async list(userId: string): Promise<NutritionTargetManagementSource[]> {
    const targets = await this.repository.findByUserId(userId);
    return targets.map((target) => this.toManagementSource(target));
  }

  async current(userId: string): Promise<NutritionTargetManagementSource[]> {
    const targets = await this.repository.findLatestByUserId(userId);
    return targets.map((target) => this.toManagementSource(target));
  }

  /**
   * Returns approved targets that are effective for the current day. This is
   * intentionally separate from `current()`, whose management view also
   * exposes suggested, dismissed, and expired versions for profile review.
   */
  async active(userId: string, asOf = new Date()): Promise<NutritionTargetManagementSource[]> {
    const targets = await this.repository.findLatestByUserId(userId);
    return targets
      .filter((target) =>
        (target.approvalStatus ?? 'APPROVED') === 'APPROVED'
        && target.effectiveAt <= asOf
        && (target.expiresAt == null || target.expiresAt > asOf)
        && target.kind !== 'range'
        && target.targetValue != null,
      )
      .map((target) => this.toManagementSource(target));
  }

  async create(userId: string, input: CreateNutritionTargetInput): Promise<NutritionTargetManagementSource> {
    this.validateInput(input);
    const version = await this.repository.nextVersion(userId, input.nutrient);
    const created = await this.repository.create({
      userId,
      nutrientKey: input.nutrient,
      kind: this.toDomainKind(input.kind),
      targetValue: input.kind === 'RANGE' ? null : input.value ?? null,
      unit: input.unit,
      approvalSource: this.toApprovalSource(input.source),
      approvalStatus: input.approvalStatus,
      sourceReference: null,
      effectiveAt: input.effectiveAt,
      approvedAt: new Date(),
      expiresAt: input.expirationAt ?? null,
      version,
      rangeMin: input.rangeMin ?? null,
      rangeMax: input.rangeMax ?? null,
      notes: input.notes ?? null,
    });
    return this.toManagementSource(created);
  }

  async update(userId: string, id: string, input: UpdateNutritionTargetInput): Promise<NutritionTargetManagementSource> {
    const current = await this.repository.findByIdForUser(userId, id);
    if (current == null) throw new NotFoundException('Nutrition target not found.');

    const source = input.source ?? this.fromApprovalSource(current.approvalSource);
    const kind = input.kind ?? this.fromDomainKind(current.kind);
    const value = input.value === undefined ? current.targetValue : input.value;
    const rangeMin = input.rangeMin === undefined ? current.rangeMin : input.rangeMin;
    const rangeMax = input.rangeMax === undefined ? current.rangeMax : input.rangeMax;
    const effectiveAt = input.effectiveAt ?? current.effectiveAt;
    const expirationAt = input.expirationAt === undefined ? current.expiresAt : input.expirationAt;
    const approvalStatus = input.approvalStatus ?? current.approvalStatus ?? 'APPROVED';
    const unit = input.unit ?? current.unit;
    const merged: CreateNutritionTargetInput = {
      userId,
      nutrient: current.nutrientKey,
      value,
      unit,
      kind,
      source,
      approvalStatus,
      effectiveAt,
      expirationAt,
      notes: input.notes === undefined ? current.notes : input.notes,
      rangeMin,
      rangeMax,
    };
    this.validateInput(merged);
    const version = await this.repository.nextVersion(userId, current.nutrientKey);
    const updated = await this.repository.create({
      userId,
      nutrientKey: current.nutrientKey,
      kind: this.toDomainKind(kind),
      targetValue: kind === 'RANGE' ? null : value ?? null,
      unit,
      approvalSource: this.toApprovalSource(source),
      approvalStatus,
      sourceReference: current.sourceReference,
      effectiveAt,
      approvedAt: new Date(),
      expiresAt: expirationAt,
      version,
      rangeMin: kind === 'RANGE' ? rangeMin ?? null : null,
      rangeMax: kind === 'RANGE' ? rangeMax ?? null : null,
      notes: merged.notes ?? null,
    });
    return this.toManagementSource(updated);
  }

  private validateInput(input: CreateNutritionTargetInput): void {
    if (!(NUTRITION_TARGET_DESCRIPTORS as readonly { key: string }[]).some((item) => item.key === input.nutrient)) {
      throw new BadRequestException('Unsupported nutrition target nutrient.');
    }
    if (!NUTRITION_TARGET_KINDS.includes(input.kind)) throw new BadRequestException('Unsupported nutrition target kind.');
    if (!NUTRITION_TARGET_SOURCES.includes(input.source)) throw new BadRequestException('Unsupported nutrition target source.');
    if (!NUTRITION_TARGET_APPROVAL_STATUSES.includes(input.approvalStatus)) throw new BadRequestException('Unsupported nutrition target approval status.');
    const expectedUnit = UNIT_BY_NUTRIENT[input.nutrient];
    if (input.unit.trim().toLowerCase() !== expectedUnit.toLowerCase()) {
      throw new BadRequestException(`The ${input.nutrient} target must use ${expectedUnit}.`);
    }
    if (input.effectiveAt.getTime() !== input.effectiveAt.getTime()) throw new BadRequestException('Effective date must be valid.');
    if (input.expirationAt != null) {
      if (input.expirationAt.getTime() !== input.expirationAt.getTime()) throw new BadRequestException('Expiration date must be valid.');
      if (input.expirationAt <= input.effectiveAt) throw new BadRequestException('Expiration date must be after the effective date.');
    }
    if (input.kind === 'RANGE') {
      this.positive(input.rangeMin, 'Range minimum');
      this.positive(input.rangeMax, 'Range maximum');
      if (new Decimal(input.rangeMax!).lte(new Decimal(input.rangeMin!))) throw new BadRequestException('Range maximum must be greater than range minimum.');
    } else {
      this.positive(input.value, 'Target value');
    }
  }

  private positive(value: string | null | undefined, label: string): void {
    if (value == null || value.trim() === '') throw new BadRequestException(`${label} must be a positive number.`);
    try {
      const parsed = new Decimal(value);
      if (!parsed.isFinite() || parsed.lte(0)) throw new Error('not-positive');
    } catch {
      throw new BadRequestException(`${label} must be a positive number.`);
    }
  }

  private toManagementSource(target: IndividualizedNutritionTargetEvidence): NutritionTargetManagementSource {
    const expired = target.expiresAt != null && target.expiresAt <= new Date();
    return {
      id: target.id,
      userId: target.userId,
      nutrient: target.nutrientKey,
      value: target.targetValue,
      unit: target.unit,
      kind: target.kind === 'upper-limit' ? 'UPPER_LIMIT' : target.kind === 'lower-target' ? 'LOWER_TARGET' : 'RANGE',
      source: this.fromApprovalSource(target.approvalSource),
      approvalStatus: expired && (target.approvalStatus ?? 'APPROVED') === 'APPROVED' ? 'EXPIRED' : target.approvalStatus ?? 'APPROVED',
      effectiveAt: target.effectiveAt,
      expirationAt: target.expiresAt,
      version: target.version,
      notes: target.notes ?? null,
      rangeMin: target.rangeMin ?? null,
      rangeMax: target.rangeMax ?? null,
    };
  }

  private toDomainKind(kind: NutritionTargetKind): 'upper-limit' | 'lower-target' | 'range' {
    return kind === 'UPPER_LIMIT' ? 'upper-limit' : kind === 'LOWER_TARGET' ? 'lower-target' : 'range';
  }

  private fromDomainKind(kind: 'upper-limit' | 'lower-target' | 'range'): NutritionTargetKind {
    return kind === 'upper-limit' ? 'UPPER_LIMIT' : kind === 'lower-target' ? 'LOWER_TARGET' : 'RANGE';
  }

  private toApprovalSource(source: NutritionTargetSource): string {
    return source === 'CLINICIAN' ? 'CLINICIAN_APPROVED' : source === 'USER' ? 'USER_APPROVED' : source;
  }

  private fromApprovalSource(source: string): NutritionTargetSource {
    if (source === 'CLINICIAN_APPROVED') return 'CLINICIAN';
    if (source === 'USER_APPROVED') return 'USER';
    if (source === 'SYSTEM_SUGGESTED') return 'SYSTEM_SUGGESTED';
    if (source === 'IMPORTED') return 'IMPORTED';
    return 'IMPORTED';
  }
}
