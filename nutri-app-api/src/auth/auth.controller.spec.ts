import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    loginWithGoogle: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    getMe: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: new ConfigService({
          refreshTokenCookieName: 'refresh-cookie',
          authCookieSecure: true,
          authCookieSameSite: 'lax',
          refreshTokenTtlSeconds: 100,
          authFrontendUrl: 'http://localhost:5173',
        }) },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes email verification input to the service', async () => {
    authService.verifyEmail.mockResolvedValue({ message: 'Email verified successfully.' });

    await expect(controller.verifyEmail({ email: 'person@example.com', code: '123456' }))
      .resolves.toEqual({ message: 'Email verified successfully.' });
    expect(authService.verifyEmail).toHaveBeenCalledWith('person@example.com', '123456');
  });

  it('passes resend input to the service', async () => {
    authService.resendVerification.mockResolvedValue({
      message: 'If the account is eligible, a verification email has been sent.',
    });

    await expect(controller.resendVerification({ email: 'person@example.com' }))
      .resolves.toEqual({
        message: 'If the account is eligible, a verification email has been sent.',
      });
    expect(authService.resendVerification).toHaveBeenCalledWith('person@example.com');
  });

  it('sets the refresh cookie while preserving the access-token response', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1', email: 'person@example.com', createdAt: new Date() },
    });
    const reply = { setCookie: jest.fn() };

    await expect(controller.login(
      { email: 'person@example.com', password: 'password123' },
      reply as never,
    )).resolves.toEqual({
      accessToken: 'access-token',
      user: { id: 'user-1', email: 'person@example.com', createdAt: expect.any(Date) },
    });
    expect(reply.setCookie).toHaveBeenCalledWith('refresh-cookie', 'refresh-token', expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 100,
    }));
  });

  it('refreshes from the HttpOnly cookie and rotates the cookie', async () => {
    authService.refresh.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: { id: 'user-1', email: 'person@example.com', createdAt: new Date() },
    });
    const reply = { setCookie: jest.fn() };

    await expect(controller.refresh(
      { cookies: { 'refresh-cookie': 'old-refresh-token' } } as never,
      reply as never,
    )).resolves.toEqual(expect.objectContaining({ accessToken: 'new-access-token' }));
    expect(authService.refresh).toHaveBeenCalledWith('old-refresh-token');
    expect(reply.setCookie).toHaveBeenCalledWith('refresh-cookie', 'new-refresh-token', expect.any(Object));
  });

  it('revokes the cookie session and clears the cookie on logout', async () => {
    authService.logout.mockResolvedValue({ message: 'Logged out successfully.' });
    const reply = { clearCookie: jest.fn() };

    await expect(controller.logout(
      { cookies: { 'refresh-cookie': 'refresh-token' } } as never,
      reply as never,
    )).resolves.toEqual({ message: 'Logged out successfully.' });
    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
    expect(reply.clearCookie).toHaveBeenCalledWith('refresh-cookie', expect.objectContaining({ path: '/' }));
  });

  it('passes forgot-password requests to the service', async () => {
    authService.forgotPassword.mockResolvedValue({
      message: 'If the account is eligible, a password reset email has been sent.',
    });

    await expect(controller.forgotPassword({ email: 'person@example.com' }))
      .resolves.toEqual({ message: 'If the account is eligible, a password reset email has been sent.' });
    expect(authService.forgotPassword).toHaveBeenCalledWith('person@example.com');
  });

  it('passes reset-password requests to the service', async () => {
    authService.resetPassword.mockResolvedValue({ message: 'Password reset successfully.' });

    await expect(controller.resetPassword({
      email: 'person@example.com',
      code: '123456',
      password: 'new-password',
    })).resolves.toEqual({ message: 'Password reset successfully.' });
    expect(authService.resetPassword).toHaveBeenCalledWith(
      'person@example.com',
      '123456',
      'new-password',
    );
  });

  it('authenticates the Google callback and sets the existing refresh cookie', async () => {
    authService.loginWithGoogle.mockResolvedValue({
      accessToken: 'google-access-token',
      refreshToken: 'google-refresh-token',
      user: { id: 'user-1', email: 'person@example.com', createdAt: new Date() },
    });
    const reply = { setCookie: jest.fn() };
    const request = {
      user: {
        providerId: 'google-user-1',
        email: 'person@example.com',
        emailVerified: true,
      },
    };

    await expect(controller.googleCallback(request as never, reply as never))
      .resolves.toEqual(expect.objectContaining({ accessToken: 'google-access-token' }));
    expect(authService.loginWithGoogle).toHaveBeenCalledWith(request.user);
    expect(reply.setCookie).toHaveBeenCalledWith('refresh-cookie', 'google-refresh-token', expect.any(Object));
  });

  it('bridges browser Google callbacks to the frontend without changing API responses', async () => {
    authService.loginWithGoogle.mockResolvedValue({
      accessToken: 'google-access-token',
      refreshToken: 'google-refresh-token',
      user: { id: 'user-1', email: 'person@example.com', createdAt: new Date() },
    });
    const reply = {
      setCookie: jest.fn(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const request = {
      headers: { accept: 'text/html,application/xhtml+xml' },
      user: {
        providerId: 'google-user-1',
        email: 'person@example.com',
        emailVerified: true,
      },
    };

    await expect(controller.googleCallback(request as never, reply as never))
      .resolves.toEqual(expect.objectContaining({ accessToken: 'google-access-token' }));
    expect(reply.type).toHaveBeenCalledWith('text/html; charset=utf-8');
    expect(reply.send).toHaveBeenCalledWith(expect.stringContaining('nutriapp:google-auth'));
  });
});
