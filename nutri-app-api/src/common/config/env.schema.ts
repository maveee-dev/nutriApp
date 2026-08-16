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
});