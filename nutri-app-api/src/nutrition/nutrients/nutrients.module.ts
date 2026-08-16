import { Module } from '@nestjs/common';
import { NutrientsController } from './nutrients.controller.js';
import { NutrientsService } from './nutrients.service.js';

@Module({
  controllers: [NutrientsController],
  providers: [NutrientsService]
})
export class NutrientsModule {}
