import { Profile as PrismaProfile } from '../../../../generated/prisma/client.js';
import { ProfileSource } from '../../sources/profile.source.js';

export class ProfileRepositoryMapper {
  static toProfileSource(row: PrismaProfile): ProfileSource {
    return {
      id: row.id,
      userId: row.userId,
      age: row.age,
      sex: row.sex,
      heightCm: row.heightCm,
      weightKg: row.weightKg,
      activityLevel: row.activityLevel,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
