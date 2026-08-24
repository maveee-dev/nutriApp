import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthOtpPurpose } from '../../generated/prisma/client.js';
import { EmailService } from '../email/email.service.js';
import { UsersService } from '../users/services/users.service.js';
import { AuthService } from './auth.service.js';
import { AuthenticatedUserNotFoundError } from './errors/authenticated-user-not-found.error.js';
import { InvalidCredentialsError } from './errors/invalid-credentials.error.js';
import { InvalidEmailVerificationError } from './errors/invalid-email-verification.error.js';
import { InvalidRefreshTokenError } from './errors/invalid-refresh-token.error.js';
import { InvalidGoogleAccountError } from './errors/invalid-google-account.error.js';
import { PasswordResetRepository } from './password-reset/password-reset.repository.js';
import { AuthOtpChallengeRepository } from './otp/auth-otp-challenge.repository.js';
import { OtpService } from './otp/otp.service.js';
import { RefreshTokenService } from './refresh/refresh-token.service.js';
import { RefreshTokenSessionRepository } from './refresh/refresh-token-session.repository.js';
import { PASSWORD_HASHER } from './auth.tokens.js';
import type { GoogleAccountSource } from './types/google-account.source.js';

describe('AuthService', () => {
  const verificationCode = '123456';

  function createFixture() {
    const usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findByEmailWithVerification: jest.fn(),
      findById: jest.fn(),
      markEmailVerified: jest.fn(async () => true),
    };
    const jwtService = { signAsync: jest.fn(async () => 'access-token') };
    const otpService = {
      generate: jest.fn(() => ({ code: verificationCode, codeHash: 'otp-hash' })),
      verify: jest.fn(() => true),
    };
    const otpChallengeRepository = {
      create: jest.fn(async (input: unknown) => input),
      findLatestActive: jest.fn(),
      invalidateActive: jest.fn(async () => ({ count: 0 })),
      incrementAttemptsIfAvailable: jest.fn(async () => ({ count: 1 })),
      consumeAndVerifyUser: jest.fn(async () => true),
    };
    const emailService = {
      sendVerificationEmail: jest.fn(async () => undefined),
      sendPasswordResetEmail: jest.fn(async () => undefined),
    };
    const refreshTokenService = {
      generate: jest.fn(() => ({ token: 'refresh-token', tokenHash: 'refresh-hash', familyId: 'family-1' })),
      hash: jest.fn(() => 'refresh-hash'),
    };
    const refreshTokenSessionRepository = {
      create: jest.fn(async (input: unknown) => input),
      findByTokenHash: jest.fn(),
      revoke: jest.fn(async () => undefined),
      revokeFamily: jest.fn(async () => undefined),
      rotate: jest.fn(async () => true),
    };
    const passwordResetRepository = {
      complete: jest.fn(async () => true),
    };
    const passwordHasher = {
      hash: jest.fn(async () => 'new-password-hash'),
      verify: jest.fn(async () => true),
    };
    const configService = new ConfigService({
      otpExpirationSeconds: 600,
      otpResendCooldownSeconds: 60,
      otpMaxAttempts: 5,
      otpExpirationSeconds: 600,
      otpResendCooldownSeconds: 60,
    });

    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      otpService as unknown as OtpService,
      otpChallengeRepository as unknown as AuthOtpChallengeRepository,
      emailService as unknown as EmailService,
      configService,
      refreshTokenService as unknown as RefreshTokenService,
      refreshTokenSessionRepository as unknown as RefreshTokenSessionRepository,
      passwordResetRepository as unknown as PasswordResetRepository,
      passwordHasher,
    );

    return {
      service,
      usersService,
      jwtService,
      otpService,
      otpChallengeRepository,
      emailService,
      refreshTokenService,
      refreshTokenSessionRepository,
      passwordResetRepository,
      passwordHasher,
    };
  }

  it('normalizes registration email, persists only the OTP hash, and sends verification mail', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmail.mockResolvedValue(null);
    fixture.usersService.create.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      createdAt: new Date(),
    });

    await fixture.service.register({ email: ' Person@Example.COM ', password: 'password123' });

    expect(fixture.usersService.findByEmail).toHaveBeenCalledWith('person@example.com');
    expect(fixture.usersService.create).toHaveBeenCalledWith('person@example.com', expect.any(String));
    expect(fixture.otpService.generate).toHaveBeenCalledWith(6);
    expect(fixture.otpChallengeRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      purpose: AuthOtpPurpose.EMAIL_VERIFICATION,
      codeHash: 'otp-hash',
      maxAttempts: 5,
    }));
    expect(fixture.otpChallengeRepository.create.mock.calls[0][0]).not.toHaveProperty('code');
    expect(fixture.emailService.sendVerificationEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'person@example.com',
      code: verificationCode,
    }));
  });

  it('rejects login for an unverified account with the same error as invalid credentials', async () => {
    const fixture = createFixture();
    const passwordHash = await bcrypt.hash('password123', 4);
    fixture.usersService.findByEmailWithPassword.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      password: passwordHash,
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(fixture.service.login({ email: 'person@example.com', password: 'password123' }))
      .rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(fixture.jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('keeps migrated verified users able to log in', async () => {
    const fixture = createFixture();
    const passwordHash = await bcrypt.hash('password123', 4);
    fixture.usersService.findByEmailWithPassword.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      password: passwordHash,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(fixture.service.login({ email: 'PERSON@example.com', password: 'password123' }))
      .resolves.toEqual(expect.objectContaining({ accessToken: 'access-token' }));
    expect(fixture.refreshTokenSessionRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      tokenHash: 'refresh-hash',
      familyId: 'family-1',
    }));
  });

  it('creates a verified user with a default profile path for a new Google account', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue(null);
    fixture.usersService.create.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      createdAt: new Date(),
    });

    const account: GoogleAccountSource = {
      providerId: 'google-user-1',
      email: ' Person@example.com ',
      emailVerified: true,
    };

    await expect(fixture.service.loginWithGoogle(account))
      .resolves.toEqual(expect.objectContaining({ accessToken: 'access-token' }));
    expect(fixture.passwordHasher.hash).toHaveBeenCalledWith(expect.any(String));
    expect(fixture.usersService.create).toHaveBeenCalledWith(
      'person@example.com',
      'new-password-hash',
      expect.any(Date),
    );
    expect(fixture.refreshTokenSessionRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
    }));
  });

  it('links a Google account to an existing verified user without creating a duplicate', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: new Date(),
    });
    fixture.usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      createdAt: new Date(),
    });

    await fixture.service.loginWithGoogle({
      providerId: 'google-user-1',
      email: 'PERSON@example.com',
      emailVerified: true,
    });

    expect(fixture.usersService.create).not.toHaveBeenCalled();
    expect(fixture.usersService.markEmailVerified).not.toHaveBeenCalled();
    expect(fixture.refreshTokenSessionRepository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
  });

  it('verifies and links an existing unverified email account', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: null,
    });
    fixture.usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      createdAt: new Date(),
    });

    await fixture.service.loginWithGoogle({
      providerId: 'google-user-1',
      email: 'person@example.com',
      emailVerified: true,
    });

    expect(fixture.usersService.markEmailVerified).toHaveBeenCalledWith('user-1', expect.any(Date));
    expect(fixture.otpChallengeRepository.invalidateActive).toHaveBeenCalledWith(
      'user-1',
      AuthOtpPurpose.EMAIL_VERIFICATION,
      expect.any(Date),
    );
  });

  it('does not authenticate an unverified Google profile', async () => {
    const fixture = createFixture();

    try {
      await fixture.service.loginWithGoogle({
        providerId: 'google-user-1',
        email: 'person@example.com',
        emailVerified: false,
      });
      throw new Error('Expected Google login to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidGoogleAccountError);
    }
    expect(fixture.usersService.findByEmailWithVerification).not.toHaveBeenCalled();
  });

  it('rotates a valid refresh token within the same token family', async () => {
    const fixture = createFixture();
    fixture.usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      createdAt: new Date(),
    });
    fixture.refreshTokenSessionRepository.findByTokenHash.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });

    await expect(fixture.service.refresh('old-refresh-token'))
      .resolves.toEqual(expect.objectContaining({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }));
    expect(fixture.refreshTokenService.generate).toHaveBeenCalledWith('family-1');
    expect(fixture.refreshTokenSessionRepository.rotate).toHaveBeenCalledWith(expect.objectContaining({
      previousSessionId: 'session-1',
      familyId: 'family-1',
      tokenHash: 'refresh-hash',
    }));
  });

  it('revokes the token family when a rotated token is reused', async () => {
    const fixture = createFixture();
    fixture.refreshTokenSessionRepository.findByTokenHash.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
    });

    await expect(fixture.service.refresh('reused-refresh-token'))
      .rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(fixture.refreshTokenSessionRepository.revokeFamily).toHaveBeenCalledWith(
      'family-1',
      expect.any(Date),
    );
  });

  it('revokes the current session on logout and remains idempotent', async () => {
    const fixture = createFixture();
    fixture.refreshTokenSessionRepository.findByTokenHash.mockResolvedValue({
      id: 'session-1',
      revokedAt: null,
    });

    await expect(fixture.service.logout('refresh-token'))
      .resolves.toEqual({ message: 'Logged out successfully.' });
    expect(fixture.refreshTokenSessionRepository.revoke).toHaveBeenCalledWith('session-1');

    fixture.refreshTokenSessionRepository.findByTokenHash.mockResolvedValue(null);
    await expect(fixture.service.logout('unknown-token'))
      .resolves.toEqual({ message: 'Logged out successfully.' });
  });

  it('returns the same password-reset response for an unknown account', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue(null);

    await expect(fixture.service.forgotPassword('unknown@example.com'))
      .resolves.toEqual({ message: 'If the account is eligible, a password reset email has been sent.' });
    expect(fixture.otpService.generate).not.toHaveBeenCalled();
    expect(fixture.emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('creates a hashed password-reset challenge and sends the reset email', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: new Date(),
    });
    fixture.otpChallengeRepository.findLatestActive.mockResolvedValue(null);

    await expect(fixture.service.forgotPassword(' PERSON@example.com '))
      .resolves.toEqual({ message: 'If the account is eligible, a password reset email has been sent.' });
    expect(fixture.otpChallengeRepository.invalidateActive).toHaveBeenCalledWith(
      'user-1',
      AuthOtpPurpose.PASSWORD_RESET,
      expect.any(Date),
    );
    expect(fixture.otpChallengeRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      purpose: AuthOtpPurpose.PASSWORD_RESET,
      codeHash: 'otp-hash',
      maxAttempts: 5,
    }));
    expect(fixture.otpChallengeRepository.create.mock.calls[0][0]).not.toHaveProperty('code');
    expect(fixture.emailService.sendPasswordResetEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'person@example.com',
      code: verificationCode,
    }));
  });

  it('does not issue another password-reset challenge during cooldown', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: new Date(),
    });
    fixture.otpChallengeRepository.findLatestActive.mockResolvedValue({
      id: 'challenge-1',
      cooldownUntil: new Date(Date.now() + 60_000),
    });

    await expect(fixture.service.forgotPassword('person@example.com'))
      .resolves.toEqual({ message: 'If the account is eligible, a password reset email has been sent.' });
    expect(fixture.otpService.generate).not.toHaveBeenCalled();
    expect(fixture.emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('atomically resets the password and invalidates sessions and reset challenges', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: new Date(),
    });
    fixture.otpChallengeRepository.findLatestActive.mockResolvedValue({
      id: 'challenge-1',
      codeHash: 'otp-hash',
      attemptCount: 0,
      maxAttempts: 5,
    });

    await expect(fixture.service.resetPassword('person@example.com', verificationCode, 'new-password'))
      .resolves.toEqual({ message: 'Password reset successfully.' });
    expect(fixture.passwordHasher.hash).toHaveBeenCalledWith('new-password');
    expect(fixture.passwordResetRepository.complete).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      challengeId: 'challenge-1',
      passwordHash: 'new-password-hash',
    }));
  });

  it('rejects invalid, expired, and exhausted reset challenges without changing the password', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: new Date(),
    });
    fixture.otpChallengeRepository.findLatestActive.mockResolvedValue(null);

    await expect(fixture.service.resetPassword('person@example.com', verificationCode, 'new-password'))
      .rejects.toThrow('Invalid or expired password reset code');

    fixture.otpChallengeRepository.findLatestActive.mockResolvedValue({
      id: 'challenge-1',
      codeHash: 'otp-hash',
      attemptCount: 1,
      maxAttempts: 5,
    });
    fixture.otpService.verify.mockReturnValue(false);
    await expect(fixture.service.resetPassword('person@example.com', '000000', 'new-password'))
      .rejects.toThrow('Invalid or expired password reset code');
    expect(fixture.otpChallengeRepository.incrementAttemptsIfAvailable)
      .toHaveBeenCalledWith('challenge-1', 5);
    expect(fixture.passwordHasher.hash).not.toHaveBeenCalled();

    fixture.otpChallengeRepository.findLatestActive.mockResolvedValue({
      id: 'challenge-1',
      codeHash: 'otp-hash',
      attemptCount: 5,
      maxAttempts: 5,
    });
    await expect(fixture.service.resetPassword('person@example.com', verificationCode, 'new-password'))
      .rejects.toThrow('Invalid or expired password reset code');
  });

  it('verifies a valid OTP and atomically consumes the challenge', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: null,
    });
    fixture.otpChallengeRepository.findLatestActive.mockResolvedValue({
      id: 'challenge-1',
      codeHash: 'otp-hash',
      attemptCount: 0,
      maxAttempts: 5,
      cooldownUntil: new Date(Date.now() + 60_000),
    });

    await expect(fixture.service.verifyEmail(' PERSON@example.com ', verificationCode))
      .resolves.toEqual({ message: 'Email verified successfully.' });
    expect(fixture.otpService.verify).toHaveBeenCalledWith(verificationCode, 'otp-hash');
    expect(fixture.otpChallengeRepository.consumeAndVerifyUser).toHaveBeenCalledWith(
      'user-1',
      'challenge-1',
      expect.any(Date),
    );
  });

  it('rejects invalid OTPs and records an attempt without revealing challenge state', async () => {
    const fixture = createFixture();
    fixture.otpService.verify.mockReturnValue(false);
    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: null,
    });
    fixture.otpChallengeRepository.findLatestActive.mockResolvedValue({
      id: 'challenge-1',
      codeHash: 'otp-hash',
      attemptCount: 1,
      maxAttempts: 5,
    });

    await expect(fixture.service.verifyEmail('person@example.com', '000000'))
      .rejects.toBeInstanceOf(InvalidEmailVerificationError);
    expect(fixture.otpChallengeRepository.incrementAttemptsIfAvailable)
      .toHaveBeenCalledWith('challenge-1', 5);
    expect(fixture.otpChallengeRepository.consumeAndVerifyUser).not.toHaveBeenCalled();
  });

  it('rejects expired, exhausted, missing, and already verified challenges uniformly', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: null,
    });
    fixture.otpChallengeRepository.findLatestActive.mockResolvedValue(null);

    await expect(fixture.service.verifyEmail('person@example.com', verificationCode))
      .rejects.toBeInstanceOf(InvalidEmailVerificationError);

    fixture.otpChallengeRepository.findLatestActive.mockResolvedValue({
      id: 'challenge-1',
      codeHash: 'otp-hash',
      attemptCount: 5,
      maxAttempts: 5,
    });
    await expect(fixture.service.verifyEmail('person@example.com', verificationCode))
      .rejects.toBeInstanceOf(InvalidEmailVerificationError);

    fixture.usersService.findByEmailWithVerification.mockResolvedValue(null);
    await expect(fixture.service.verifyEmail('unknown@example.com', verificationCode))
      .rejects.toBeInstanceOf(InvalidEmailVerificationError);

    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: new Date(),
    });
    await expect(fixture.service.verifyEmail('person@example.com', verificationCode))
      .rejects.toBeInstanceOf(InvalidEmailVerificationError);
  });

  it('does not resend during the cooldown window', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: null,
    });
    fixture.otpChallengeRepository.findLatestActive.mockResolvedValue({
      id: 'challenge-1',
      cooldownUntil: new Date(Date.now() + 60_000),
    });

    await expect(fixture.service.resendVerification('person@example.com'))
      .resolves.toEqual({ message: 'If the account is eligible, a verification email has been sent.' });
    expect(fixture.otpService.generate).not.toHaveBeenCalled();
    expect(fixture.emailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('invalidates the previous challenge and sends a replacement after cooldown', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: null,
    });
    fixture.otpChallengeRepository.findLatestActive.mockResolvedValue({
      id: 'challenge-1',
      cooldownUntil: new Date(Date.now() - 1),
    });

    await fixture.service.resendVerification('person@example.com');

    expect(fixture.otpChallengeRepository.invalidateActive).toHaveBeenCalledWith(
      'user-1',
      AuthOtpPurpose.EMAIL_VERIFICATION,
      expect.any(Date),
    );
    expect(fixture.otpChallengeRepository.create).toHaveBeenCalled();
    expect(fixture.emailService.sendVerificationEmail).toHaveBeenCalled();
  });

  it('uses the same generic resend response for unknown or already verified accounts', async () => {
    const fixture = createFixture();
    fixture.usersService.findByEmailWithVerification.mockResolvedValue(null);

    await expect(fixture.service.resendVerification('unknown@example.com'))
      .resolves.toEqual({ message: 'If the account is eligible, a verification email has been sent.' });

    fixture.usersService.findByEmailWithVerification.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      emailVerifiedAt: new Date(),
    });
    await expect(fixture.service.resendVerification('person@example.com'))
      .resolves.toEqual({ message: 'If the account is eligible, a verification email has been sent.' });
  });

  it('preserves the existing not-found behavior for getMe', async () => {
    const fixture = createFixture();
    fixture.usersService.findById.mockResolvedValue(null);

    await expect(fixture.service.getMe('missing-user'))
      .rejects.toBeInstanceOf(AuthenticatedUserNotFoundError);
  });
});
