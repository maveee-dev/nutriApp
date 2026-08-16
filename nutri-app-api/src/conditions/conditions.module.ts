import { Module } from '@nestjs/common';
import { ConditionsController } from './controllers/conditions.controller.js';
import { ConditionsService } from './services/conditions.service.js';
import { ConditionsRepository } from './repositories/conditions.repository.js';

@Module({
  controllers: [ConditionsController],
  providers: [ConditionsService, ConditionsRepository],
  exports: [ConditionsRepository],
})
export class ConditionsModule {}
