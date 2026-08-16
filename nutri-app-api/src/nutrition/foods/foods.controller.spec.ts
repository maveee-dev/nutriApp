import { Test, TestingModule } from '@nestjs/testing';
import { FoodsController } from './controllers/foods.controller.js';
import { FoodsService } from './services/foods.service.js';

describe('FoodsController', () => {
  let controller: FoodsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodsController],
      providers: [{ provide: FoodsService, useValue: {} }],
    }).compile();

    controller = module.get<FoodsController>(FoodsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
