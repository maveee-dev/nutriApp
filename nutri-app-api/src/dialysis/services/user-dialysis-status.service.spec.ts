import { DialysisStatus } from '../../../generated/prisma/client.js';
import { UserDialysisStatusRepository } from '../repositories/user-dialysis-status.repository.js';
import { UserDialysisStatusService } from './user-dialysis-status.service.js';

describe('UserDialysisStatusService', () => {
  it('returns the current status when one has been reported', async () => {
    const repository = {
      findByUserId: async () => ({
        userId: 'user-1',
        status: DialysisStatus.INACTIVE,
        effectiveAt: null,
        reportedAt: new Date('2026-08-15T00:00:00.000Z'),
        updatedAt: new Date('2026-08-15T00:00:00.000Z'),
      }),
    } satisfies Pick<UserDialysisStatusRepository, 'findByUserId'>;

    const service = new UserDialysisStatusService(repository as unknown as UserDialysisStatusRepository);

    await expect(service.get('user-1')).resolves.toMatchObject({
      status: DialysisStatus.INACTIVE,
    });
  });

  it('preserves an unknown status when no record exists', async () => {
    const repository = { findByUserId: async () => null };
    const service = new UserDialysisStatusService(repository as unknown as UserDialysisStatusRepository);

    await expect(service.get('user-1')).resolves.toBeNull();
  });

  it('updates the reported status through the repository', async () => {
    const repository = {
      upsert: async (_userId: string, input: { status: DialysisStatus }) => ({
        userId: 'user-1',
        status: input.status,
        effectiveAt: null,
        reportedAt: new Date(),
        updatedAt: new Date(),
      }),
    };
    const service = new UserDialysisStatusService(repository as unknown as UserDialysisStatusRepository);

    await expect(service.update('user-1', { status: DialysisStatus.ACTIVE })).resolves.toMatchObject({
      status: DialysisStatus.ACTIVE,
    });
  });
});
