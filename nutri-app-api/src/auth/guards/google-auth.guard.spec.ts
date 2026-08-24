import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { jest } from '@jest/globals';
import passport from 'passport';
import { GoogleAuthGuard } from './google-auth.guard.js';
import { InvalidGoogleStateError } from '../errors/invalid-google-state.error.js';

describe('GoogleAuthGuard', () => {
  const configService = new ConfigService({
    authCookieSecure: false,
    authCookieSameSite: 'lax',
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('translates Passport OAuth redirects to FastifyReply.redirect', async () => {
    const authenticate = jest.spyOn(passport, 'authenticate').mockImplementation((
      _strategy: never,
      _options: never,
      _callback: never,
    ) => ((
      _request: unknown,
      response: { statusCode: number; setHeader: Function; end: Function },
    ) => {
      response.statusCode = 302;
      response.setHeader('Location', 'https://accounts.google.com/o/oauth2/v2/auth');
      response.setHeader('Content-Length', '0');
      response.end();
    }) as never);
    const request = { url: '/auth/google', cookies: {}, query: {} };
    const reply = createReplyDouble();
    const guard = new GoogleAuthGuard(configService);

    await guard.canActivate(createContext(request, reply));

    expect(reply.setCookie).toHaveBeenCalledWith(
      'nutriapp_google_oauth_state',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, path: '/auth/google', maxAge: 600 }),
    );
    expect(reply.redirect).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/v2/auth',
      302,
    );
    expect(authenticate).toHaveBeenCalledWith(
      'google',
      expect.objectContaining({ session: false, state: expect.any(String) }),
      expect.any(Function),
    );
  });

  it('validates the Fastify cookie state and attaches the callback account', async () => {
    const authenticate = jest.spyOn(passport, 'authenticate').mockImplementation((
      _strategy: never,
      _options: never,
      callback: never,
    ) => ((
      _request: unknown,
      _response: unknown,
      _next: unknown,
    ) => {
      (callback as unknown as Function)(null, {
        providerId: 'google-user-1',
        email: 'person@example.com',
        emailVerified: true,
      }, { provider: 'google' });
    }) as never);
    const state = 'test-state-value';
    const request = {
      url: `/auth/google/callback?code=oauth-code&state=${state}`,
      cookies: { nutriapp_google_oauth_state: state },
      query: { state },
    };
    const reply = createReplyDouble();
    const guard = new GoogleAuthGuard(configService);

    await guard.canActivate(createContext(request, reply));

    expect(reply.clearCookie).toHaveBeenCalledWith(
      'nutriapp_google_oauth_state',
      expect.objectContaining({ path: '/auth/google' }),
    );
    expect((request as { user?: unknown }).user).toEqual({
      providerId: 'google-user-1',
      email: 'person@example.com',
      emailVerified: true,
    });
    expect(authenticate).toHaveBeenCalledWith('google', { session: false }, expect.any(Function));
  });

  it('rejects a callback with a missing or mismatched state', async () => {
    const authenticate = jest.spyOn(passport, 'authenticate');
    const request = {
      url: '/auth/google/callback?code=oauth-code&state=wrong-state',
      cookies: { nutriapp_google_oauth_state: 'expected-state' },
      query: { state: 'wrong-state' },
    };
    const guard = new GoogleAuthGuard(configService);

    await expect(guard.canActivate(createContext(request, createReplyDouble())))
      .rejects.toBeInstanceOf(InvalidGoogleStateError);
    expect(authenticate).not.toHaveBeenCalled();
  });
});

function createContext(request: Record<string, unknown>, reply: Record<string, jest.Mock>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => reply,
    }),
  } as unknown as ExecutionContext;
}

function createReplyDouble() {
  const reply = {
    setCookie: jest.fn(),
    clearCookie: jest.fn(),
    header: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return reply;
}
