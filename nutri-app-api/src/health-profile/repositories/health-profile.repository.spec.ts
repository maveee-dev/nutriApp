import { HealthProfileRepository } from './health-profile.repository.js';

describe('HealthProfileRepository', () => {
  it('loads profile-owned allergy and medication records in deterministic order', async () => {
    const prisma = {
      userAllergy: { findMany: async () => [{ id: 'a', userId: 'u', name: 'Milk', reaction: null, notes: null, createdAt: new Date(), updatedAt: new Date() }] },
      userMedication: { findMany: async () => [{ id: 'm', userId: 'u', name: 'Medicine', dosage: null, frequency: null, notes: null, createdAt: new Date(), updatedAt: new Date() }] },
    };
    const repository = new HealthProfileRepository(prisma as never);
    await expect(repository.findAllergies('u')).resolves.toHaveLength(1);
    await expect(repository.findMedications('u')).resolves.toHaveLength(1);
  });
});
