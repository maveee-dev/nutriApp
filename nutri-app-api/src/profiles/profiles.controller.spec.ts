import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesController } from './controllers/profiles.controller.js';
import { ProfilesService } from './services/profiles.service.js';

describe('ProfilesController', () => {
  let controller: ProfilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: ProfilesService, useValue: {} }],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
