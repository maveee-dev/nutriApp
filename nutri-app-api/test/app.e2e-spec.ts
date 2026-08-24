import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';
process.env.DATABASE_URL = 'postgresql://localhost:5432/nutri_app_test';
process.env.OTP_HASH_SECRET = 'test-otp-hash-secret-with-at-least-32-characters';
process.env.REFRESH_TOKEN_HASH_SECRET = 'test-refresh-token-hash-secret-with-32-chars';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
process.env.RESEND_API_KEY = 're_test_key';
process.env.EMAIL_FROM = 'NutriApp <no-reply@example.com>';

const { AppModule } = await import('../src/app.module.js');

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
