import { Module } from '@nestjs/common';
import { LaboratoryResultsController } from './controllers/laboratory-results.controller.js';
import { LaboratoryResultsRepository } from './repositories/laboratory-results.repository.js';
import { EgfrInterpreter } from './services/egfr-interpreter.js';
import { LaboratoryInterpreter } from './services/laboratory-interpreter.js';
import { LaboratoryResultsService } from './services/laboratory-results.service.js';
import { PotassiumInterpreter } from './services/potassium-interpreter.js';
import { PhosphorusInterpreter } from './services/phosphorus-interpreter.js';
import { LaboratoryController } from './controllers/laboratory.controller.js';
import { LaboratoryReportsRepository } from './repositories/laboratory-reports.repository.js';
import { LaboratoryAnalysisService } from './services/laboratory-analysis.service.js';
import { LaboratoryReportService } from './services/laboratory-report.service.js';
import { LaboratoryConsultationProjector } from './services/laboratory-consultation.projector.js';

@Module({
  controllers: [LaboratoryResultsController, LaboratoryController],
  providers: [
    LaboratoryResultsRepository,
    LaboratoryResultsService,
    LaboratoryReportsRepository,
    LaboratoryAnalysisService,
    LaboratoryReportService,
    LaboratoryConsultationProjector,
    EgfrInterpreter,
    PotassiumInterpreter,
    PhosphorusInterpreter,
    LaboratoryInterpreter,
  ],
  exports: [LaboratoryResultsRepository, LaboratoryResultsService, LaboratoryReportService, LaboratoryAnalysisService, LaboratoryConsultationProjector],
})
export class LaboratoryModule {}
