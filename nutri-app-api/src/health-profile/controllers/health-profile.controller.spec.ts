import { HealthProfileController } from './health-profile.controller.js';

describe('HealthProfileController', () => {
  it('exposes the authenticated health profile projection', async () => {
    const source = { personal: null, conditions: [], dialysis: null, allergies: [], medications: [], nutritionTargets: [] };
    const controller = new HealthProfileController({ get: async () => source } as never);
    await expect(controller.get({ sub: 'user-1' } as never)).resolves.toEqual(source);
  });
});
