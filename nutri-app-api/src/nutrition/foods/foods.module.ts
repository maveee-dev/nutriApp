import { Module } from '@nestjs/common';
import { FoodsController } from './controllers/foods.controller.js';
import { FoodsRepository } from './repositories/foods.repository.js';
import { FoodsService } from './services/foods.service.js';
import { FoodPresentationService } from './services/food-presentation.service.js';
import { FoodQueryNormalizationService } from './services/food-query-normalization.service.js';

@Module({
  controllers: [FoodsController],
  providers: [FoodsService, FoodsRepository, FoodPresentationService, FoodQueryNormalizationService],
  exports: [FoodsService, FoodsRepository, FoodPresentationService, FoodQueryNormalizationService],
})
export class FoodsModule {}
