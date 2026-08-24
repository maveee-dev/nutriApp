import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface CreateRefreshTokenSessionInput {
  readonly userId: string;
  readonly tokenHash: string;
  readonly familyId: string;
  readonly expiresAt: Date;
}

/** Persistence boundary for refresh sessions and atomic token rotation. */
@Injectable()
export class RefreshTokenSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateRefreshTokenSessionInput) {
    return this.prisma.refreshTokenSession.create({ data: input });
  }

  findByTokenHash(tokenHash: string) {
    return this.prisma.refreshTokenSession.findUnique({ where: { tokenHash } });
  }

  markUsed(id: string, lastUsedAt = new Date()) {
    return this.prisma.refreshTokenSession.update({ where: { id }, data: { lastUsedAt } });
  }

  revoke(id: string, revokedAt = new Date()) {
    return this.prisma.refreshTokenSession.update({ where: { id }, data: { revokedAt } });
  }

  revokeFamily(familyId: string, revokedAt = new Date()) {
    return this.prisma.refreshTokenSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt },
    });
  }

  revokeAllForUser(userId: string, revokedAt = new Date()) {
    return this.prisma.refreshTokenSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }

  async rotate(input: CreateRefreshTokenSessionInput & { previousSessionId: string; rotatedAt?: Date }): Promise<boolean> {
    const rotatedAt = input.rotatedAt ?? new Date();

    return this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.refreshTokenSession.updateMany({
        where: {
          id: input.previousSessionId,
          revokedAt: null,
          expiresAt: { gt: rotatedAt },
        },
        data: { revokedAt: rotatedAt, lastUsedAt: rotatedAt },
      });

      if (revoked.count !== 1) {
        return false;
      }

      await transaction.refreshTokenSession.create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          familyId: input.familyId,
          expiresAt: input.expiresAt,
        },
      });

      return true;
    });
  }
}
