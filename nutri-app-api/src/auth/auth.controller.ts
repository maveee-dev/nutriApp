import { Body, Controller, Post, Get, UseGuards, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { AuthMessageDto } from './dto/auth-message.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/types/jwt-payload.interface.js';
import { UserResponseDto } from '../users/dto/response/user-response.dto.js';
import { UserResponseMapper } from '../users/mappers/controller/user-response.mapper.js';
import { LoginResponseDto } from './dto/auth-response.dto.js';
import { AuthMapper } from './mappers/auth.mapper.js';
import type { GoogleAccountSource } from './types/google-account.source.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto
  ): Promise<UserResponseDto> {
    const user = await this.authService.register(dto);
    
    return UserResponseMapper.toUserResponseDto(user);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LoginResponseDto>{
    const result = await this.authService.login(dto);
    this.setRefreshTokenCookie(reply, result.refreshToken);

    return AuthMapper.toResponse(result);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {
    // Passport redirects the browser to Google.
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LoginResponseDto> {
    const googleAccount = (request as FastifyRequest & { user: GoogleAccountSource }).user;
    const result = await this.authService.loginWithGoogle(googleAccount);
    this.setRefreshTokenCookie(reply, result.refreshToken);

    const response = AuthMapper.toResponse(result);

    if (request.headers?.accept?.includes('text/html')) {
      this.sendGoogleBrowserBridge(reply, response);
    }

    return response;
  }

  @Post('refresh')
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.refresh(request.cookies?.[this.refreshTokenCookieName()]);
    this.setRefreshTokenCookie(reply, result.refreshToken);

    return AuthMapper.toResponse(result);
  }

  @Post('logout')
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthMessageDto> {
    const result = await this.authService.logout(request.cookies?.[this.refreshTokenCookieName()]);
    reply.clearCookie(this.refreshTokenCookieName(), this.refreshTokenCookieOptions());
    return result;
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<AuthMessageDto> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<AuthMessageDto> {
    return this.authService.resetPassword(dto.email, dto.code, dto.password);
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<AuthMessageDto> {
    return this.authService.verifyEmail(dto.email, dto.code);
  }

  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<AuthMessageDto> {
    return this.authService.resendVerification(dto.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @CurrentUser() user: JwtPayload
  ): Promise<UserResponseDto> {
    const result = await this.authService.getMe(user.sub);

    return UserResponseMapper.toUserResponseDto(result);
  }

  private setRefreshTokenCookie(reply: FastifyReply, refreshToken: string): void {
    reply.setCookie(this.refreshTokenCookieName(), refreshToken, this.refreshTokenCookieOptions());
  }

  private refreshTokenCookieName(): string {
    return this.configService.get<string>('refreshTokenCookieName') ?? 'nutriapp_refresh_token';
  }

  private refreshTokenCookieOptions() {
    const domain = this.configService.get<string>('authCookieDomain');
    return {
      httpOnly: true,
      secure: this.configService.get<boolean>('authCookieSecure') ?? true,
      sameSite: (this.configService.get<string>('authCookieSameSite') ?? 'lax') as 'lax' | 'strict' | 'none',
      // The frontend may call the API through a /api proxy. A root path keeps
      // the HttpOnly cookie available to /api/auth/refresh as well as direct
      // /auth deployments, without exposing its value to JavaScript.
      path: '/',
      maxAge: this.configService.get<number>('refreshTokenTtlSeconds') ?? 2_592_000,
      ...(domain == null ? {} : { domain }),
    };
  }

  private sendGoogleBrowserBridge(reply: FastifyReply, response: LoginResponseDto): void {
    const targetOrigin = this.configService.get<string>('authFrontendUrl');

    if (targetOrigin == null) {
      return;
    }

    const message = JSON.stringify({ type: 'nutriapp:google-auth', ...response })
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
    const target = JSON.stringify(targetOrigin);

    reply.type('text/html; charset=utf-8').send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>NutriApp sign-in complete</title></head>
  <body>
    <p>Sign-in complete. You can close this window.</p>
    <script>
      const message = ${message};
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(message, ${target});
        window.close();
      }
    </script>
  </body>
</html>`);
  }

}

