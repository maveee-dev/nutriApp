import { Test, TestingModule } from '@nestjs/testing';
import { ServingsService } from './servings.service.js';

describe('ServingsService', () => {
  let service: ServingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServingsService],
    }).compile();

    service = module.get<ServingsService>(ServingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
