import { Test, TestingModule } from '@nestjs/testing';
import { NutrientsController } from './nutrients.controller.js';

describe('NutrientsController', () => {
  let controller: NutrientsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NutrientsController],
    }).compile();

    controller = module.get<NutrientsController>(NutrientsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
