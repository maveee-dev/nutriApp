import { Module } from '@nestjs/common';
import { IndividualizedNutritionTargetEvidenceRepository } from '../analysis/repositories/individualized-nutrition-target-evidence.repository.js';
import { NutritionTargetController } from './controllers/nutrition-target.controller.js';
import { NutritionTargetService } from './services/nutrition-target.service.js';

@Module({
  controllers: [NutritionTargetController],
  providers: [IndividualizedNutritionTargetEvidenceRepository, NutritionTargetService],
  exports: [IndividualizedNutritionTargetEvidenceRepository, NutritionTargetService],
})
export class NutritionTargetsModule {}
