import { jest } from '@jest/globals';
import { AuthOtpPurpose } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PasswordResetRepository } from './password-reset.repository.js';

describe('PasswordResetRepository', () => {
  it('atomically consumes the OTP, updates the password, revokes sessions, and invalidates remaining challenges', async () => {
    const consumeChallenge = jest.fn(async () => ({ count: 1 }));
    const updateUser = jest.fn(async () => ({ count: 1 }));
    const revokeSessions = jest.fn(async () => ({ count: 2 }));
    const invalidateChallenges = jest.fn(async () => ({ count: 1 }));
    const transaction = {
      authOtpChallenge: {
        updateMany: jest.fn()
          .mockImplementationOnce(consumeChallenge)
          .mockImplementationOnce(invalidateChallenges),
      },
      user: { updateMany: updateUser },
      refreshTokenSession: { updateMany: revokeSessions },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (value: typeof transaction) => Promise<boolean>) => callback(transaction)),
    };
    const repository = new PasswordResetRepository(prisma as unknown as PrismaService);
    const resetAt = new Date('2026-08-24T12:00:00.000Z');

    await expect(repository.complete({
      userId: 'user-1',
      challengeId: 'challenge-1',
      passwordHash: 'new-password-hash',
      resetAt,
    })).resolves.toBe(true);

    expect(consumeChallenge).toHaveBeenCalledWith({
      where: {
        id: 'challenge-1',
        userId: 'user-1',
        purpose: AuthOtpPurpose.PASSWORD_RESET,
        consumedAt: null,
      },
      data: { consumedAt: resetAt },
    });
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'new-password-hash' },
    });
    expect(revokeSessions).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: resetAt },
    });
    expect(invalidateChallenges).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        purpose: AuthOtpPurpose.PASSWORD_RESET,
        consumedAt: null,
      },
      data: { consumedAt: resetAt },
    });
  });

  it('does not update the password when the OTP was consumed concurrently', async () => {
    const consumeChallenge = jest.fn(async () => ({ count: 0 }));
    const updateUser = jest.fn();
    const transaction = {
      authOtpChallenge: { updateMany: consumeChallenge },
      user: { updateMany: updateUser },
      refreshTokenSession: { updateMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (value: typeof transaction) => Promise<boolean>) => callback(transaction)),
    };
    const repository = new PasswordResetRepository(prisma as unknown as PrismaService);

    await expect(repository.complete({
      userId: 'user-1',
      challengeId: 'challenge-1',
      passwordHash: 'new-password-hash',
    })).resolves.toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
  });
});
