import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum([
    'development',
    'test',
    'production',
  ]),

  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
  AUTH_FRONTEND_URL: z.string().url().optional(),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default('gemini-2.5-flash'),

  CORS_ORIGIN: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  OTP_EXPIRATION_SECONDS: z.coerce.number().int().positive().default(600),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative().default(60),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_HASH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),
  REFRESH_TOKEN_HASH_SECRET: z.string().min(32),
  REFRESH_TOKEN_COOKIE_NAME: z.string().min(1).default('nutriapp_refresh_token'),
  AUTH_COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1),
  RESEND_API_URL: z.string().url().default('https://api.resend.com'),
  EMAIL_FROM: z.string().min(1),
  APP_PUBLIC_URL: z.string().url().optional(),
  SWAGGER_ENABLED: z.enum(['true', 'false']).default('true'),
});
