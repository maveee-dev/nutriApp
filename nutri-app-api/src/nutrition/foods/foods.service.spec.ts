import { Test, TestingModule } from '@nestjs/testing';
import { FoodsService } from './services/foods.service.js';
import { FoodsRepository } from './repositories/foods.repository.js';

describe('FoodsService', () => {
  let service: FoodsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodsService,
        { provide: FoodsRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<FoodsService>(FoodsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
