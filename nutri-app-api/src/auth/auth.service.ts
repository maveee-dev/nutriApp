import { Inject, Logger, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthOtpPurpose } from '../../generated/prisma/client.js';
import { EmailService } from '../email/email.service.js';
import { UserSource } from '../users/sources/user.source.js';
import { UsersService } from '../users/services/users.service.js';
import { RegisterData } from './types/register.data.js';
import { LoginData } from './types/login.data.js';
import { AuthEmailAlreadyExistsError } from './errors/email-already-exists.error.js';
import { InvalidCredentialsError } from './errors/invalid-credentials.error.js';
import { AuthenticatedUserNotFoundError } from './errors/authenticated-user-not-found.error.js';
import { InvalidEmailVerificationError } from './errors/invalid-email-verification.error.js';
import { InvalidRefreshTokenError } from './errors/invalid-refresh-token.error.js';
import { InvalidPasswordResetError } from './errors/invalid-password-reset.error.js';
import { AuthOtpChallengeRepository } from './otp/auth-otp-challenge.repository.js';
import { OtpService } from './otp/otp.service.js';
import { AuthMessageDto } from './dto/auth-message.dto.js';
import { RefreshTokenService } from './refresh/refresh-token.service.js';
import { RefreshTokenSessionRepository } from './refresh/refresh-token-session.repository.js';
import { PASSWORD_HASHER } from './auth.tokens.js';
import type { PasswordHasher } from './security/password-hasher.js';
import { PasswordResetRepository } from './password-reset/password-reset.repository.js';
import type { GoogleAccountSource } from './types/google-account.source.js';
import { InvalidGoogleAccountError } from './errors/invalid-google-account.error.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly otpChallengeRepository: AuthOtpChallengeRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly refreshTokenSessionRepository: RefreshTokenSessionRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async register(
    data: RegisterData
  ): Promise<UserSource> {
    this.logger.log(`Register attempt: ${data.email}`);

    const email = this.normalizeEmail(data.email);

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      this.logger.warn(`Register failed: email already exists - ${data.email}`);
      throw new AuthEmailAlreadyExistsError();
    }

    const hashedPassword  = await bcrypt.hash(data.password, 12);

    const user = await this.usersService.create(email, hashedPassword);

    await this.issueVerificationChallenge(user.id, user.email);

    this.logger.log(`User registered: ${user.id}`);

    return user;
  }

  async login(data: LoginData) {
    this.logger.log(`Login attempt: ${data.email}`);

    const email = this.normalizeEmail(data.email);

    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      this.logger.warn(`Login failed: user not found - ${data.email}`);
      throw new InvalidCredentialsError();
    }

    const passwordMatch = await bcrypt.compare(
      data.password,
      user.password,
    );

    if (!passwordMatch) {
      this.logger.warn(`Login failed: invalid password - ${data.email}`);
      throw new InvalidCredentialsError();
    }

    if (user.emailVerifiedAt == null) {
      this.logger.warn(`Login failed: invalid credentials - ${data.email}`);
      throw new InvalidCredentialsError();
    }

    const tokens = await this.issueTokens(user);

    this.logger.log(`Login success: ${user.id}`);
    
    return {
      ...tokens,
      user,
    };
  }

  async loginWithGoogle(account: GoogleAccountSource) {
    if (!account.emailVerified) {
      throw new InvalidGoogleAccountError();
    }

    const email = this.normalizeEmail(account.email);
    const existingUser = await this.usersService.findByEmailWithVerification(email);
    const now = new Date();
    let user: UserSource;

    if (existingUser == null) {
      const generatedPassword = randomBytes(32).toString('base64url');
      const passwordHash = await this.passwordHasher.hash(generatedPassword);
      user = await this.usersService.create(email, passwordHash, now);
    } else {
      if (existingUser.emailVerifiedAt == null) {
        await this.usersService.markEmailVerified(existingUser.id, now);
        await this.otpChallengeRepository.invalidateActive(
          existingUser.id,
          AuthOtpPurpose.EMAIL_VERIFICATION,
          now,
        );
      }

      const linkedUser = await this.usersService.findById(existingUser.id);

      if (linkedUser == null) {
        throw new InvalidGoogleAccountError();
      }

      user = linkedUser;
    }

    const tokens = await this.issueTokens(user);

    return {
      ...tokens,
      user,
    };
  }

  async refresh(refreshTokenInput?: string) {
    if (refreshTokenInput == null || refreshTokenInput.length === 0) {
      throw new InvalidRefreshTokenError();
    }

    const now = new Date();
    const tokenHash = this.refreshTokenService.hash(refreshTokenInput);
    const session = await this.refreshTokenSessionRepository.findByTokenHash(tokenHash);

    if (session == null) {
      throw new InvalidRefreshTokenError();
    }

    if (session.revokedAt != null) {
      await this.refreshTokenSessionRepository.revokeFamily(session.familyId, now);
      throw new InvalidRefreshTokenError();
    }

    if (session.expiresAt <= now) {
      await this.refreshTokenSessionRepository.revoke(session.id, now);
      throw new InvalidRefreshTokenError();
    }

    const user = await this.usersService.findById(session.userId);

    if (user == null) {
      await this.refreshTokenSessionRepository.revoke(session.id, now);
      throw new InvalidRefreshTokenError();
    }

    const generated = this.refreshTokenService.generate(session.familyId);
    const refreshTtlSeconds = this.configService.get<number>('refreshTokenTtlSeconds') ?? 2_592_000;
    const rotated = await this.refreshTokenSessionRepository.rotate({
      previousSessionId: session.id,
      userId: user.id,
      tokenHash: generated.tokenHash,
      familyId: generated.familyId,
      expiresAt: new Date(now.getTime() + refreshTtlSeconds * 1000),
      rotatedAt: now,
    });

    if (!rotated) {
      await this.refreshTokenSessionRepository.revokeFamily(session.familyId, now);
      throw new InvalidRefreshTokenError();
    }

    const accessToken = await this.issueAccessToken(user);

    return { accessToken, refreshToken: generated.token, user };
  }

  async logout(refreshTokenInput?: string): Promise<AuthMessageDto> {
    if (refreshTokenInput != null && refreshTokenInput.length > 0) {
      const tokenHash = this.refreshTokenService.hash(refreshTokenInput);
      const session = await this.refreshTokenSessionRepository.findByTokenHash(tokenHash);

      if (session != null && session.revokedAt == null) {
        await this.refreshTokenSessionRepository.revoke(session.id);
      }
    }

    return { message: 'Logged out successfully.' };
  }

  async forgotPassword(emailInput: string): Promise<AuthMessageDto> {
    const email = this.normalizeEmail(emailInput);
    const user = await this.usersService.findByEmailWithVerification(email);

    if (user == null) {
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    const now = new Date();
    const activeChallenge = await this.otpChallengeRepository.findLatestActive(
      user.id,
      AuthOtpPurpose.PASSWORD_RESET,
      now,
    );

    if (activeChallenge != null && activeChallenge.cooldownUntil > now) {
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    await this.issuePasswordResetChallenge(user.id, user.email, now);

    return { message: PASSWORD_RESET_REQUEST_MESSAGE };
  }

  async resetPassword(emailInput: string, code: string, password: string): Promise<AuthMessageDto> {
    const email = this.normalizeEmail(emailInput);
    const user = await this.usersService.findByEmailWithVerification(email);
    const challenge = user == null
      ? null
      : await this.otpChallengeRepository.findLatestActive(
        user.id,
        AuthOtpPurpose.PASSWORD_RESET,
        new Date(),
      );

    if (user == null || challenge == null || challenge.attemptCount >= challenge.maxAttempts) {
      throw new InvalidPasswordResetError();
    }

    if (!this.otpService.verify(code, challenge.codeHash)) {
      await this.otpChallengeRepository.incrementAttemptsIfAvailable(
        challenge.id,
        challenge.maxAttempts,
      );
      throw new InvalidPasswordResetError();
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const completed = await this.passwordResetRepository.complete({
      userId: user.id,
      challengeId: challenge.id,
      passwordHash,
      resetAt: new Date(),
    });

    if (!completed) {
      throw new InvalidPasswordResetError();
    }

    return { message: 'Password reset successfully.' };
  }

  async verifyEmail(emailInput: string, code: string): Promise<AuthMessageDto> {
    const email = this.normalizeEmail(emailInput);
    const user = await this.usersService.findByEmailWithVerification(email);
    const challenge = user == null
      ? null
      : await this.otpChallengeRepository.findLatestActive(
          user.id,
          AuthOtpPurpose.EMAIL_VERIFICATION,
          new Date(),
        );

    if (user == null || user.emailVerifiedAt != null || challenge == null) {
      throw new InvalidEmailVerificationError();
    }

    if (challenge.attemptCount >= challenge.maxAttempts) {
      throw new InvalidEmailVerificationError();
    }

    if (!this.otpService.verify(code, challenge.codeHash)) {
      await this.otpChallengeRepository.incrementAttemptsIfAvailable(
        challenge.id,
        challenge.maxAttempts,
      );
      throw new InvalidEmailVerificationError();
    }

    const verified = await this.otpChallengeRepository.consumeAndVerifyUser(
      user.id,
      challenge.id,
      new Date(),
    );

    if (!verified) {
      throw new InvalidEmailVerificationError();
    }

    return { message: 'Email verified successfully.' };
  }

  async resendVerification(emailInput: string): Promise<AuthMessageDto> {
    const email = this.normalizeEmail(emailInput);
    const user = await this.usersService.findByEmailWithVerification(email);

    if (user == null || user.emailVerifiedAt != null) {
      return { message: VERIFICATION_RESEND_MESSAGE };
    }

    const now = new Date();
    const activeChallenge = await this.otpChallengeRepository.findLatestActive(
      user.id,
      AuthOtpPurpose.EMAIL_VERIFICATION,
      now,
    );

    if (activeChallenge != null && activeChallenge.cooldownUntil > now) {
      return { message: VERIFICATION_RESEND_MESSAGE };
    }

    await this.issueVerificationChallenge(user.id, user.email, now);

    return { message: VERIFICATION_RESEND_MESSAGE };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new AuthenticatedUserNotFoundError();
    }

    return user;
  }

  private async issueVerificationChallenge(userId: string, email: string, now = new Date()): Promise<void> {
    const generated = this.otpService.generate(6);
    const expirationSeconds = this.configService.get<number>('otpExpirationSeconds') ?? 600;
    const cooldownSeconds = this.configService.get<number>('otpResendCooldownSeconds') ?? 60;
    const maxAttempts = this.configService.get<number>('otpMaxAttempts') ?? 5;

    await this.otpChallengeRepository.invalidateActive(
      userId,
      AuthOtpPurpose.EMAIL_VERIFICATION,
      now,
    );

    await this.otpChallengeRepository.create({
      userId,
      purpose: AuthOtpPurpose.EMAIL_VERIFICATION,
      codeHash: generated.codeHash,
      expiresAt: new Date(now.getTime() + expirationSeconds * 1000),
      sentAt: now,
      cooldownUntil: new Date(now.getTime() + cooldownSeconds * 1000),
      maxAttempts,
    });

    await this.emailService.sendVerificationEmail({
      to: email,
      code: generated.code,
      expiresInMinutes: Math.max(1, Math.ceil(expirationSeconds / 60)),
    });
  }

  private async issuePasswordResetChallenge(userId: string, email: string, now: Date): Promise<void> {
    const generated = this.otpService.generate(6);
    const expirationSeconds = this.configService.get<number>('otpExpirationSeconds') ?? 600;
    const cooldownSeconds = this.configService.get<number>('otpResendCooldownSeconds') ?? 60;
    const maxAttempts = this.configService.get<number>('otpMaxAttempts') ?? 5;

    await this.otpChallengeRepository.invalidateActive(
      userId,
      AuthOtpPurpose.PASSWORD_RESET,
      now,
    );

    await this.otpChallengeRepository.create({
      userId,
      purpose: AuthOtpPurpose.PASSWORD_RESET,
      codeHash: generated.codeHash,
      expiresAt: new Date(now.getTime() + expirationSeconds * 1000),
      sentAt: now,
      cooldownUntil: new Date(now.getTime() + cooldownSeconds * 1000),
      maxAttempts,
    });

    await this.emailService.sendPasswordResetEmail({
      to: email,
      code: generated.code,
      expiresInMinutes: Math.max(1, Math.ceil(expirationSeconds / 60)),
    });
  }

  private async issueTokens(user: UserSource) {
    const generated = this.refreshTokenService.generate();
    const refreshTtlSeconds = this.configService.get<number>('refreshTokenTtlSeconds') ?? 2_592_000;

    await this.refreshTokenSessionRepository.create({
      userId: user.id,
      tokenHash: generated.tokenHash,
      familyId: generated.familyId,
      expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
    });

    return {
      accessToken: await this.issueAccessToken(user),
      refreshToken: generated.token,
    };
  }

  private issueAccessToken(user: UserSource): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}

const VERIFICATION_RESEND_MESSAGE = 'If the account is eligible, a verification email has been sent.';
const PASSWORD_RESET_REQUEST_MESSAGE = 'If the account is eligible, a password reset email has been sent.';
