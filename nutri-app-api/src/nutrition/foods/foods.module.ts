import { Module } from '@nestjs/common';
import { FoodsController } from './controllers/foods.controller.js';
import { FoodsRepository } from './repositories/foods.repository.js';
import { FoodsService } from './services/foods.service.js';
import { FoodPresentationService } from './services/food-presentation.service.js';

@Module({
  controllers: [FoodsController],
  providers: [FoodsService, FoodsRepository, FoodPresentationService],
  exports: [FoodsService, FoodsRepository, FoodPresentationService],
})
export class FoodsModule {}
