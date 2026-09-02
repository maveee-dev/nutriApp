import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import type { ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { DailyTrackerController } from './controllers/daily-tracker.controller.js';
import { DailyTrackerService } from './services/daily-tracker.service.js';

describe('Daily tracker HTTP integration', () => {
  let app: NestFastifyApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('protects the today endpoint and maps the tracker response', async () => {
    const service = {
      getToday: async () => ({ date: '2026-08-30', entries: [], totals: {}, targets: {} }),
    };
    const authGuard = {
      canActivate: (context: ExecutionContext) => {
        context.switchToHttp().getRequest().user = { sub: 'user-1' };
        return true;
      },
    };
    const module = await Test.createTestingModule({
      controllers: [DailyTrackerController],
      providers: [{ provide: DailyTrackerService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    await request(app.getHttpServer())
      .get('/daily-tracker/today')
      .expect(200)
      .expect({ date: '2026-08-30', entries: [], totals: {}, targets: {} });
  });
});
