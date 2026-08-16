import { Module } from '@nestjs/common';
import { ServingsController } from './servings.controller.js';
import { ServingsService } from './servings.service.js';

@Module({
  controllers: [ServingsController],
  providers: [ServingsService]
})
export class ServingsModule {}
