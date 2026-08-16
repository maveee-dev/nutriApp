import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesService } from './services/profiles.service.js';
import { ProfilesRepository } from './repositories/profiles.repository.js';

describe('ProfilesService', () => {
  let service: ProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: ProfilesRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
