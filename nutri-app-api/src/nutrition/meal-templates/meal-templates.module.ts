import { Module } from '@nestjs/common';
import { MealTemplatesRepository } from './repositories/meal-templates.repository.js';
import { MealTemplatesService } from './services/meal-templates.service.js';

@Module({
  providers: [MealTemplatesRepository, MealTemplatesService],
  exports: [MealTemplatesRepository, MealTemplatesService],
})
export class MealTemplatesModule {}
