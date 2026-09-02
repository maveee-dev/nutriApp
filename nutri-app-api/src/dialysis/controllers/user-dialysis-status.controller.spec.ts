import { DialysisModality, DialysisStatus } from '../../../generated/prisma/client.js';
import { jest } from '@jest/globals';
import { UserDialysisStatusController } from './user-dialysis-status.controller.js';

describe('UserDialysisStatusController', () => {
  it('forwards the submitted dialysis modality into the evaluation context', async () => {
    const service = {
      update: jest.fn().mockResolvedValue({
        status: DialysisStatus.ACTIVE,
        modality: DialysisModality.HEMODIALYSIS,
        effectiveAt: new Date('2026-08-20T00:00:00.000Z'),
        reportedAt: new Date('2026-08-20T00:00:00.000Z'),
        updatedAt: new Date('2026-08-20T00:00:00.000Z'),
      }),
    };
    const controller = new UserDialysisStatusController(service as never);

    await controller.update(
      { sub: 'user-1' } as never,
      {
        status: DialysisStatus.ACTIVE,
        modality: DialysisModality.HEMODIALYSIS,
        effectiveAt: '2026-08-20T00:00:00.000Z',
      },
    );

    expect(service.update).toHaveBeenCalledWith('user-1', {
      status: DialysisStatus.ACTIVE,
      modality: DialysisModality.HEMODIALYSIS,
      effectiveAt: new Date('2026-08-20T00:00:00.000Z'),
    });
  });

  it('forwards an explicit null so an optional dialysis start date can be cleared', async () => {
    const service = {
      update: jest.fn().mockResolvedValue({
        status: DialysisStatus.ACTIVE,
        modality: DialysisModality.HEMODIALYSIS,
        effectiveAt: null,
        reportedAt: new Date('2026-08-29T00:00:00.000Z'),
        updatedAt: new Date('2026-08-29T00:00:00.000Z'),
      }),
    };
    const controller = new UserDialysisStatusController(service as never);

    await controller.update(
      { sub: 'user-1' } as never,
      {
        status: DialysisStatus.ACTIVE,
        modality: DialysisModality.HEMODIALYSIS,
        effectiveAt: null,
      },
    );

    expect(service.update).toHaveBeenCalledWith('user-1', {
      status: DialysisStatus.ACTIVE,
      modality: DialysisModality.HEMODIALYSIS,
      effectiveAt: null,
    });
  });
});
