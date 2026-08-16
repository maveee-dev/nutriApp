import { Test, TestingModule } from '@nestjs/testing';
import { ConditionsController } from './controllers/conditions.controller.js';
import { ConditionsService } from './services/conditions.service.js';

describe('ConditionsController', () => {
  let controller: ConditionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConditionsController],
      providers: [{ provide: ConditionsService, useValue: {} }],
    }).compile();

    controller = module.get<ConditionsController>(ConditionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
