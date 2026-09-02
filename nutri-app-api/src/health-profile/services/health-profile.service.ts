import { Injectable } from '@nestjs/common';
import { ConditionsRepository } from '../../conditions/repositories/conditions.repository.js';
import { ProfilesRepository } from '../../profiles/repositories/profiles.repository.js';
import { UserDialysisStatusService } from '../../dialysis/services/user-dialysis-status.service.js';
import { NutritionTargetService } from '../../nutrition/targets/services/nutrition-target.service.js';
import { HealthProfileRepository } from '../repositories/health-profile.repository.js';
import type { UpdateHealthProfileInput } from '../types/health-profile-input.js';
import type { HealthProfileSource } from '../types/health-profile.source.js';

@Injectable()
export class HealthProfileService {
  constructor(
    private readonly profilesRepository: ProfilesRepository,
    private readonly conditionsRepository: ConditionsRepository,
    private readonly dialysisService: UserDialysisStatusService,
    private readonly healthProfileRepository: HealthProfileRepository,
    private readonly targetService: NutritionTargetService,
  ) {}

  async get(userId: string, options: { includeTargets?: boolean } = {}): Promise<HealthProfileSource> {
    const [personal, conditions, dialysis, allergies, medications, nutritionTargets] = await Promise.all([
      this.profilesRepository.getMyProfile(userId),
      this.conditionsRepository.findUserConditions(userId),
      this.dialysisService.get(userId),
      this.healthProfileRepository.findAllergies(userId),
      this.healthProfileRepository.findMedications(userId),
      options.includeTargets === false ? Promise.resolve([]) : this.targetService.current(userId),
    ]);
    return { personal, conditions, dialysis, allergies, medications, nutritionTargets };
  }

  async update(userId: string, input: UpdateHealthProfileInput): Promise<HealthProfileSource> {
    if (input.personal != null) await this.profilesRepository.upsert(userId, input.personal);
    if (input.dialysis != null) {
      await this.dialysisService.update(userId, input.dialysis);
    }
    if (input.conditionIds != null) {
      await this.conditionsRepository.replaceForUser(userId, input.conditionIds);
    }
    if (input.allergies != null) {
      await this.healthProfileRepository.replaceAllergies(userId, input.allergies);
    }
    if (input.medications != null) {
      await this.healthProfileRepository.replaceMedications(userId, input.medications);
    }
    return this.get(userId);
  }
}
