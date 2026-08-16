import { Module } from '@nestjs/common';
import { FoodsController } from './controllers/foods.controller.js';
import { FoodsRepository } from './repositories/foods.repository.js';
import { FoodsService } from './services/foods.service.js';

@Module({
  controllers: [FoodsController],
  providers: [FoodsService, FoodsRepository],
  exports: [FoodsService, FoodsRepository],
})
export class FoodsModule {}
