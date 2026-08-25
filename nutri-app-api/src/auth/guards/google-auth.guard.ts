import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Logger } from '@nestjs/common';
import passport from 'passport';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { InvalidGoogleStateError } from '../errors/invalid-google-state.error.js';
import type { GoogleAccountSource } from '../types/google-account.source.js';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest(context) as GoogleOAuthRequest;
    const reply = context.switchToHttp().getResponse<FastifyReply>();

    if (isCallbackRequest(request)) {
      const expectedState = request.cookies?.[GOOGLE_STATE_COOKIE];
      const actualState = readQueryState(request);
      request.googleOAuthRequestId = stateRequestId(actualState ?? expectedState);
      this.logger.log(`[Google OAuth] [${request.googleOAuthRequestId}] entering /auth/google/callback`);

      if (expectedState == null || actualState == null || !statesMatch(expectedState, actualState)) {
        this.logger.warn(`[Google OAuth] [${request.googleOAuthRequestId}] callback state validation failed`);
        throw new InvalidGoogleStateError();
      }

      this.logger.log(`[Google OAuth] [${request.googleOAuthRequestId}] callback state validated`);
      reply.clearCookie(GOOGLE_STATE_COOKIE, this.cookieOptions());
    } else {
      const state = randomBytes(32).toString('base64url');
      request.googleOAuthState = state;
      request.googleOAuthRequestId = stateRequestId(state);
      this.logger.log(`[Google OAuth] [${request.googleOAuthRequestId}] entering /auth/google`);
      reply.setCookie(GOOGLE_STATE_COOKIE, state, this.cookieOptions());
    }

    const options = {
      session: false,
      ...(await this.getAuthenticateOptions(context) ?? {}),
    };
    let authenticatedUser: unknown;
    let responseWasHandled = false;

    await new Promise<void>((resolve, reject) => {
      const passportReply = new FastifyPassportReply(
        reply,
        () => {
          responseWasHandled = true;
          resolve();
        },
        reject,
      );
      const authenticate = passport.authenticate('google', options, (err, user, info, status) => {
        request.authInfo = info;

        try {
          authenticatedUser = this.handleRequest(err, user, info, context, status);
          if (authenticatedUser != null) {
            this.logger.log(`[Google OAuth] [${request.googleOAuthRequestId ?? 'unknown'}] Passport authenticated Google user`);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      authenticate(request, passportReply, (err?: unknown) => {
        if (err != null) {
          reject(err);
          return;
        }

        resolve();
      });
    });

    // The initial OAuth request is completed by FastifyReply.redirect(). There
    // is no authenticated user on that leg, and the controller action is a
    // no-op. On the callback leg Passport supplies the validated account.
    if (!responseWasHandled) {
      request.user = authenticatedUser as GoogleAccountSource;
    }

    return true;
  }

  override getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<GoogleOAuthRequest>();
    return request.googleOAuthState == null ? undefined : { state: request.googleOAuthState };
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.configService.get<boolean>('authCookieSecure') ?? true,
      sameSite: (this.configService.get<string>('authCookieSameSite') ?? 'lax') as 'lax' | 'strict' | 'none',
      path: '/auth/google',
      maxAge: 600,
    };
  }
}

const GOOGLE_STATE_COOKIE = 'nutriapp_google_oauth_state';

type GoogleOAuthRequest = FastifyRequest & {
  cookies?: Record<string, string | undefined>;
  query?: Record<string, unknown>;
  googleOAuthState?: string;
  authInfo?: unknown;
  user?: GoogleAccountSource;
  googleOAuthRequestId?: string;
};

function isCallbackRequest(request: GoogleOAuthRequest): boolean {
  return request.url.startsWith('/auth/google/callback');
}

function readQueryState(request: GoogleOAuthRequest): string | null {
  const state = request.query?.state;
  return typeof state === 'string' && state.length > 0 ? state : null;
}

function statesMatch(expected: string, actual: string): boolean {
  const expectedBytes = Buffer.from(expected, 'utf8');
  const actualBytes = Buffer.from(actual, 'utf8');

  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

function stateRequestId(state: string | undefined): string {
  if (state == null || state.length === 0) {
    return 'unknown';
  }

  return createHash('sha256').update(state).digest('hex').slice(0, 12);
}

/**
 * Passport's built-in middleware is Connect/Express-oriented. In particular,
 * the OAuth redirect path writes `statusCode`, `Location`, and an empty body
 * directly to the response. This adapter keeps that boundary local to the
 * Google guard and translates it to Fastify's reply API.
 */
class FastifyPassportReply {
  private responseStatus = 302;
  private location: string | undefined;
  private ended = false;

  constructor(
    private readonly reply: FastifyReply,
    private readonly onEnd: () => void,
    private readonly onError: (error: unknown) => void,
  ) {}

  get statusCode(): number {
    return this.responseStatus;
  }

  set statusCode(value: number) {
    this.responseStatus = value;
  }

  setHeader(name: string, value: string | string[] | number): this {
    if (name.toLowerCase() === 'location') {
      this.location = String(value);
      return this;
    }

    // Fastify's redirect implementation owns the body headers. Passport sets
    // Content-Length: 0 for its Express response, which must not be copied to
    // the Fastify redirect response.
    if (name.toLowerCase() !== 'content-length') {
      this.reply.header(name, value);
    }

    return this;
  }

  getHeader(name: string): unknown {
    return undefined;
  }

  removeHeader(_name: string): void {
    // Passport does not remove headers for this strategy. Fastify owns the
    // response header lifecycle.
  }

  redirect(url: string, statusCode?: number): this {
    this.location = url;
    if (statusCode != null) {
      this.responseStatus = statusCode;
    }
    this.end();
    return this;
  }

  end(body?: string): void {
    if (this.ended) {
      return;
    }

    this.ended = true;

    try {
      if (this.location != null) {
        this.reply.redirect(this.location, this.responseStatus);
      } else {
        this.reply.code(this.responseStatus).send(body ?? '');
      }
      this.onEnd();
    } catch (error) {
      this.onError(error);
    }
  }
}
