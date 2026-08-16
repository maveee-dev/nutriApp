import { Module } from '@nestjs/common';
import { ProfilesController } from './controllers/profiles.controller.js';
import { ProfilesRepository } from './repositories/profiles.repository.js';
import { ProfilesService } from './services/profiles.service.js';

@Module({
  providers: [ProfilesService, ProfilesRepository],
  controllers: [ProfilesController],
  exports: [ProfilesRepository],
})
export class ProfilesModule {}
