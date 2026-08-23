import { Module } from '@nestjs/common';
import { LaboratoryResultsController } from './controllers/laboratory-results.controller.js';
import { LaboratoryResultsRepository } from './repositories/laboratory-results.repository.js';
import { EgfrInterpreter } from './services/egfr-interpreter.js';
import { LaboratoryInterpreter } from './services/laboratory-interpreter.js';
import { LaboratoryResultsService } from './services/laboratory-results.service.js';
import { PotassiumInterpreter } from './services/potassium-interpreter.js';
import { PhosphorusInterpreter } from './services/phosphorus-interpreter.js';

@Module({
  controllers: [LaboratoryResultsController],
  providers: [LaboratoryResultsRepository, LaboratoryResultsService, EgfrInterpreter, PotassiumInterpreter, PhosphorusInterpreter, LaboratoryInterpreter],
  exports: [LaboratoryResultsRepository, LaboratoryResultsService],
})
export class LaboratoryModule {}
