import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from './refresh-token.service.js';

describe('RefreshTokenService', () => {
  it('generates opaque tokens and verifies their hashes', () => {
    const service = new RefreshTokenService(new ConfigService({ refreshTokenHashSecret: 'b'.repeat(32) }));
    const generated = service.generate();

    expect(generated.token).toBeTruthy();
    expect(generated.tokenHash).not.toBe(generated.token);
    expect(generated.familyId).toBeTruthy();
    expect(service.matches(generated.token, generated.tokenHash)).toBe(true);
    expect(service.matches('different-token', generated.tokenHash)).toBe(false);
  });
});
