import { UserConditionResponseMapper } from '../../conditions/mappers/controller/user-condition-response.mapper.js';
import { ProfileResponseMapper } from '../../profiles/mappers/controller/profile-response.mapper.js';
import { UserDialysisStatusResponseMapper } from '../../dialysis/mappers/controller/user-dialysis-status-response.mapper.js';
import { NutritionTargetResponseMapper } from '../../nutrition/targets/mappers/nutrition-target-response.mapper.js';
import { HealthProfileResponseDto, HealthProfileAllergyResponseDto, HealthProfileMedicationResponseDto } from '../dto/response/health-profile-response.dto.js';
import type { HealthProfileSource } from '../types/health-profile.source.js';

export class HealthProfileResponseMapper {
  static toDto(source: HealthProfileSource): HealthProfileResponseDto {
    return {
      personal: source.personal == null ? null : ProfileResponseMapper.toProfileResponseDto(source.personal),
      conditions: source.conditions.map(UserConditionResponseMapper.toUserConditionResponseDto),
      dialysis: source.dialysis == null ? null : UserDialysisStatusResponseMapper.toResponseDto(source.dialysis),
      allergies: source.allergies.map((item): HealthProfileAllergyResponseDto => ({
        id: item.id, name: item.name, reaction: item.reaction, notes: item.notes, createdAt: item.createdAt, updatedAt: item.updatedAt,
      })),
      medications: source.medications.map((item): HealthProfileMedicationResponseDto => ({
        id: item.id, name: item.name, dosage: item.dosage, frequency: item.frequency, notes: item.notes, createdAt: item.createdAt, updatedAt: item.updatedAt,
      })),
      nutritionTargets: source.nutritionTargets.map(NutritionTargetResponseMapper.toDto),
    };
  }
}
