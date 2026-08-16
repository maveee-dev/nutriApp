import { Module } from '@nestjs/common';
import { MealsService } from './services/meals.service.js';
import { MealsController } from './controllers/meals.controller.js';
import { MealsRepository } from './repositories/meals.repository.js';

@Module({
  providers: [
    MealsService,
    MealsRepository,
  ],
  controllers: [MealsController]
})
export class MealsModule {}
