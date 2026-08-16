import { Module } from '@nestjs/common';
import { UserDialysisStatusController } from './controllers/user-dialysis-status.controller.js';
import { UserDialysisStatusRepository } from './repositories/user-dialysis-status.repository.js';
import { UserDialysisStatusService } from './services/user-dialysis-status.service.js';

@Module({
  controllers: [UserDialysisStatusController],
  providers: [UserDialysisStatusRepository, UserDialysisStatusService],
  exports: [UserDialysisStatusRepository],
})
export class DialysisModule {}
