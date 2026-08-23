export default () => ({
  port: Number(process.env.PORT ?? 3000),

  nodeEnv: process.env.NODE_ENV,
  corsOrigin: process.env.CORS_ORIGIN,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 120),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
});
