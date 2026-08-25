import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResponseInterceptor } from './common/interceptors/response.interceptors.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import cookie from '@fastify/cookie';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 10 * 1024 * 1024 }),
  );

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('port');
  const nodeEnv = configService.get<string>('nodeEnv') ?? 'development';

  app.enableCors({
    origin: configService.get<string>('corsOrigin') ?? (nodeEnv === 'production' ? false : true),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(cookie);
  const requestCounts = new Map<string, { count: number; resetAt: number }>();
  const rateLimitMax = configService.get<number>('rateLimitMax') ?? 120;
  const rateLimitWindowMs = configService.get<number>('rateLimitWindowMs') ?? 60_000;
  fastify.addHook('onRequest', async (request: { ip: string }, reply: any) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(self), microphone=(self)');
    const key = request.ip;
    const now = Date.now();
    const current = requestCounts.get(key);
    const entry = current == null || current.resetAt <= now
      ? { count: 1, resetAt: now + rateLimitWindowMs }
      : { count: current.count + 1, resetAt: current.resetAt };
    requestCounts.set(key, entry);
    if (entry.count > rateLimitMax) {
      return reply.code(429).header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000))).send({ statusCode: 429, message: 'Too many requests' });
    }
    // Keep the bounded in-memory guard from growing forever in long-lived processes.
    if (requestCounts.size > 10_000) {
      for (const [address, value] of requestCounts) if (value.resetAt <= now) requestCounts.delete(address);
    }
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalFilters(new HttpExceptionFilter());

  if (configService.get<boolean>('swaggerEnabled') !== false && nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NutriApp API')
      .setDescription('NutriApp backend API documentation')
      .setVersion('v1')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port, '0.0.0.0');
}
bootstrap();
