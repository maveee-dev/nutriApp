import { HealthProfileService } from './health-profile.service.js';

describe('HealthProfileService', () => {
  it('assembles one profile projection from existing profile sources and target management', async () => {
    const service = new HealthProfileService(
      { getMyProfile: async () => null } as never,
      { findUserConditions: async () => [] } as never,
      { get: async () => null } as never,
      { findAllergies: async () => [], findMedications: async () => [] } as never,
      { current: async () => [] } as never,
    );

    await expect(service.get('user-1')).resolves.toEqual({ personal: null, conditions: [], dialysis: null, allergies: [], medications: [], nutritionTargets: [] });
  });

  it('updates only the supplied profile sections and returns the assembled projection', async () => {
    const calls: string[] = [];
    const service = new HealthProfileService(
      { upsert: async () => { calls.push('personal'); }, getMyProfile: async () => null } as never,
      { replaceForUser: async () => { calls.push('conditions'); }, findUserConditions: async () => [] } as never,
      { update: async () => { calls.push('dialysis'); }, get: async () => null } as never,
      { replaceAllergies: async () => { calls.push('allergies'); }, replaceMedications: async () => { calls.push('medications'); }, findAllergies: async () => [], findMedications: async () => [] } as never,
      { current: async () => [] } as never,
    );

    await service.update('user-1', { conditionIds: [], allergies: [] });
    expect(calls).toEqual(['conditions', 'allergies']);
  });
});
