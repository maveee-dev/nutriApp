import { Test, TestingModule } from '@nestjs/testing';
import { ServingsController } from './servings.controller.js';

describe('ServingsController', () => {
  let controller: ServingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServingsController],
    }).compile();

    controller = module.get<ServingsController>(ServingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
