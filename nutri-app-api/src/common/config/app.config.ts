export default () => ({
  port: Number(process.env.PORT ?? 3000),

  nodeEnv: process.env.NODE_ENV,
});
