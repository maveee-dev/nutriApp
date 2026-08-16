import { Module } from '@nestjs/common';
import { LaboratoryResultsController } from './controllers/laboratory-results.controller.js';
import { LaboratoryResultsRepository } from './repositories/laboratory-results.repository.js';
import { EgfrInterpreter } from './services/egfr-interpreter.js';
import { LaboratoryResultsService } from './services/laboratory-results.service.js';

@Module({
  controllers: [LaboratoryResultsController],
  providers: [LaboratoryResultsRepository, LaboratoryResultsService, EgfrInterpreter],
  exports: [LaboratoryResultsRepository, LaboratoryResultsService],
})
export class LaboratoryModule {}
