import { DialysisModality, DialysisStatus } from '../../../generated/prisma/client.js';
import { UserDialysisStatusRepository } from './user-dialysis-status.repository.js';

function row(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-08-29T00:00:00.000Z');
  return {
    userId: 'user-1',
    status: DialysisStatus.ACTIVE,
    modality: DialysisModality.HEMODIALYSIS,
    effectiveAt: null,
    reportedAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('UserDialysisStatusRepository', () => {
  it('refreshes reportedAt when dialysis evidence is updated', async () => {
    let argumentsReceived: Record<string, unknown> | undefined;
    const prisma = {
      userDialysisStatus: {
        upsert: async (args: Record<string, unknown>) => {
          argumentsReceived = args;
          return row();
        },
      },
    };
    const repository = new UserDialysisStatusRepository(prisma as never);
    const before = Date.now();

    await repository.upsert('user-1', {
      status: DialysisStatus.ACTIVE,
      modality: DialysisModality.HEMODIALYSIS,
    });

    const after = Date.now();
    const update = argumentsReceived?.update as { reportedAt: Date };
    expect(update.reportedAt).toBeInstanceOf(Date);
    expect(update.reportedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(update.reportedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('preserves the current modality when an update omits it', async () => {
    let argumentsReceived: Record<string, unknown> | undefined;
    const prisma = {
      userDialysisStatus: {
        upsert: async (args: Record<string, unknown>) => {
          argumentsReceived = args;
          return row();
        },
      },
    };
    const repository = new UserDialysisStatusRepository(prisma as never);

    await repository.upsert('user-1', { status: DialysisStatus.ACTIVE });

    const update = argumentsReceived?.update as Record<string, unknown>;
    expect(update).not.toHaveProperty('modality');
    expect((argumentsReceived?.create as Record<string, unknown>).modality).toBe(DialysisModality.UNKNOWN);
  });

  it('allows callers to explicitly clear an outdated modality', async () => {
    let argumentsReceived: Record<string, unknown> | undefined;
    const prisma = {
      userDialysisStatus: {
        upsert: async (args: Record<string, unknown>) => {
          argumentsReceived = args;
          return row({ modality: DialysisModality.UNKNOWN });
        },
      },
    };
    const repository = new UserDialysisStatusRepository(prisma as never);

    await repository.upsert('user-1', {
      status: DialysisStatus.ACTIVE,
      modality: DialysisModality.UNKNOWN,
    });

    expect((argumentsReceived?.update as Record<string, unknown>).modality).toBe(DialysisModality.UNKNOWN);
  });

  it('passes an explicit null through to clear the optional dialysis start date', async () => {
    let argumentsReceived: Record<string, unknown> | undefined;
    const prisma = {
      userDialysisStatus: {
        upsert: async (args: Record<string, unknown>) => {
          argumentsReceived = args;
          return row({ effectiveAt: null });
        },
      },
    };
    const repository = new UserDialysisStatusRepository(prisma as never);

    await repository.upsert('user-1', {
      status: DialysisStatus.ACTIVE,
      modality: DialysisModality.HEMODIALYSIS,
      effectiveAt: null,
    });

    expect((argumentsReceived?.update as Record<string, unknown>).effectiveAt).toBeNull();
  });
});
