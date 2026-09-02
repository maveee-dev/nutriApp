import { jest } from '@jest/globals';
import { LaboratoryResultsRepository } from './laboratory-results.repository.js';

describe('LaboratoryResultsRepository', () => {
  it('orders same-date laboratory evidence deterministically for policy resolution', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new LaboratoryResultsRepository({ laboratoryResult: { findMany } } as never);

    await repository.findMany('user-1', { testCode: 'potassium' });

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', testCode: 'potassium' },
      orderBy: [{ collectedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });
  });
});
