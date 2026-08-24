import { jest } from '@jest/globals';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RefreshTokenSessionRepository } from './refresh-token-session.repository.js';

describe('RefreshTokenSessionRepository', () => {
  it('rotates a session atomically and creates the replacement only after revocation', async () => {
    const revokePrevious = jest.fn(async () => ({ count: 1 }));
    const createReplacement = jest.fn(async () => ({ id: 'session-2' }));
    const transaction = {
      refreshTokenSession: {
        updateMany: revokePrevious,
        create: createReplacement,
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (value: typeof transaction) => Promise<boolean>) => callback(transaction)),
    };
    const repository = new RefreshTokenSessionRepository(prisma as unknown as PrismaService);

    await expect(repository.rotate({
      previousSessionId: 'session-1',
      userId: 'user-1',
      tokenHash: 'new-hash',
      familyId: 'family-1',
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    })).resolves.toBe(true);
    expect(revokePrevious).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'session-1',
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
    }));
    expect(createReplacement).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: 'new-hash',
        familyId: 'family-1',
        expiresAt: new Date('2026-09-01T00:00:00.000Z'),
      },
    });
  });

  it('does not create a replacement when the prior session was already revoked', async () => {
    const revokePrevious = jest.fn(async () => ({ count: 0 }));
    const createReplacement = jest.fn();
    const transaction = {
      refreshTokenSession: {
        updateMany: revokePrevious,
        create: createReplacement,
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (value: typeof transaction) => Promise<boolean>) => callback(transaction)),
    };
    const repository = new RefreshTokenSessionRepository(prisma as unknown as PrismaService);

    await expect(repository.rotate({
      previousSessionId: 'session-1',
      userId: 'user-1',
      tokenHash: 'new-hash',
      familyId: 'family-1',
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    })).resolves.toBe(false);
    expect(createReplacement).not.toHaveBeenCalled();
  });
});

