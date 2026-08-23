import { ProfileResponseDto } from '../../dto/response/profile-response.dto.js';
import { ProfileSource } from '../../sources/profile.source.js';

export class ProfileResponseMapper {
  static toProfileResponseDto(source: ProfileSource): ProfileResponseDto {
    return {
      id: source.id,
      age: source.age,
      sex: source.sex,
      heightCm: source.heightCm,
      weightKg: source.weightKg,
      activityLevel: source.activityLevel,
      nutritionGoal: source.nutritionGoal,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      userId: source.userId,
    };
  }
}
