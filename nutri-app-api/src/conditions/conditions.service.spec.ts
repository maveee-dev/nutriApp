import { Test, TestingModule } from '@nestjs/testing';
import { ConditionsService } from './services/conditions.service.js';
import { ConditionsRepository } from './repositories/conditions.repository.js';

describe('ConditionsService', () => {
  let service: ConditionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConditionsService,
        { provide: ConditionsRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<ConditionsService>(ConditionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
