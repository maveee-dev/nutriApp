import { Test, TestingModule } from '@nestjs/testing';
import { NutrientsService } from './nutrients.service.js';

describe('NutrientsService', () => {
  let service: NutrientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NutrientsService],
    }).compile();

    service = module.get<NutrientsService>(NutrientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
