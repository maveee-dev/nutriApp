import { Test, TestingModule } from '@nestjs/testing';
import { MealsController } from './controllers/meals.controller.js';
import { MealsService } from './services/meals.service.js';

describe('MealsController', () => {
  let controller: MealsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MealsController],
      providers: [{ provide: MealsService, useValue: {} }],
    }).compile();

    controller = module.get<MealsController>(MealsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
