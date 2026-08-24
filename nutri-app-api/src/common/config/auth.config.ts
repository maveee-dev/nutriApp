export default () => ({
  jwtSecret: process.env.JWT_SECRET!,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
  authFrontendUrl: process.env.AUTH_FRONTEND_URL ?? (
    process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5173'
  ),
  otpExpirationSeconds: Number(process.env.OTP_EXPIRATION_SECONDS ?? 600),
  otpResendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
  otpHashSecret: process.env.OTP_HASH_SECRET,
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
  refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 2_592_000),
  refreshTokenHashSecret: process.env.REFRESH_TOKEN_HASH_SECRET,
  refreshTokenCookieName: process.env.REFRESH_TOKEN_COOKIE_NAME ?? 'nutriapp_refresh_token',
  authCookieSecure: process.env.AUTH_COOKIE_SECURE == null
    ? process.env.NODE_ENV === 'production'
    : process.env.AUTH_COOKIE_SECURE !== 'false',
  authCookieSameSite: process.env.AUTH_COOKIE_SAME_SITE ?? 'lax',
  authCookieDomain: process.env.AUTH_COOKIE_DOMAIN,
  resendApiKey: process.env.RESEND_API_KEY,
  resendApiUrl: process.env.RESEND_API_URL ?? 'https://api.resend.com',
  emailFrom: process.env.EMAIL_FROM,
  appPublicUrl: process.env.APP_PUBLIC_URL,
});
