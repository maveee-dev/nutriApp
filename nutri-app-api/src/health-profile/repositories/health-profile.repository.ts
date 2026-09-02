import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UserAllergyInput, UserMedicationInput } from '../types/health-profile-input.js';
import type { UserAllergySource, UserMedicationSource } from '../types/health-profile.source.js';

@Injectable()
export class HealthProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllergies(userId: string): Promise<UserAllergySource[]> {
    const rows = await this.prisma.userAllergy.findMany({ where: { userId }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
    return rows.map((row) => this.toAllergySource(row));
  }

  async findMedications(userId: string): Promise<UserMedicationSource[]> {
    const rows = await this.prisma.userMedication.findMany({ where: { userId }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
    return rows.map((row) => this.toMedicationSource(row));
  }

  async replaceAllergies(userId: string, items: readonly UserAllergyInput[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userAllergy.deleteMany({ where: { userId } });
      if (items.length > 0) {
        await tx.userAllergy.createMany({
          data: items.map((item) => ({
            userId,
            name: item.name,
            reaction: item.reaction ?? null,
            notes: item.notes ?? null,
          })),
        });
      }
    });
  }

  async replaceMedications(userId: string, items: readonly UserMedicationInput[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userMedication.deleteMany({ where: { userId } });
      if (items.length > 0) {
        await tx.userMedication.createMany({
          data: items.map((item) => ({
            userId,
            name: item.name,
            dosage: item.dosage ?? null,
            frequency: item.frequency ?? null,
            notes: item.notes ?? null,
          })),
        });
      }
    });
  }

  private toAllergySource(row: {
    id: string; userId: string; name: string; reaction: string | null; notes: string | null; createdAt: Date; updatedAt: Date;
  }): UserAllergySource {
    return row;
  }

  private toMedicationSource(row: {
    id: string; userId: string; name: string; dosage: string | null; frequency: string | null; notes: string | null; createdAt: Date; updatedAt: Date;
  }): UserMedicationSource {
    return row;
  }
}
