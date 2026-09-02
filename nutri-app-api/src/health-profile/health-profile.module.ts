import { Module } from '@nestjs/common';
import { ConditionsModule } from '../conditions/conditions.module.js';
import { DialysisModule } from '../dialysis/dialysis.module.js';
import { ProfilesModule } from '../profiles/profiles.module.js';
import { NutritionTargetsModule } from '../nutrition/targets/nutrition-targets.module.js';
import { HealthProfileController } from './controllers/health-profile.controller.js';
import { HealthProfileRepository } from './repositories/health-profile.repository.js';
import { HealthProfileService } from './services/health-profile.service.js';

@Module({
  imports: [ProfilesModule, ConditionsModule, DialysisModule, NutritionTargetsModule],
  controllers: [HealthProfileController],
  providers: [HealthProfileRepository, HealthProfileService],
  exports: [HealthProfileService],
})
export class HealthProfileModule {}
