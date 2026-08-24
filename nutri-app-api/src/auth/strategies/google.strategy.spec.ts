import { ConfigService } from '@nestjs/config';
import type { Profile } from 'passport-google-oauth20';
import { GoogleStrategy } from './google.strategy.js';
import { InvalidGoogleAccountError } from '../errors/invalid-google-account.error.js';

describe('GoogleStrategy', () => {
  function createStrategy(): GoogleStrategy {
    return new GoogleStrategy(new ConfigService({
      googleClientId: 'client-id',
      googleClientSecret: 'client-secret',
      googleCallbackUrl: 'http://localhost:3000/auth/google/callback',
    }));
  }

  it('maps a verified Google profile to a provider-neutral account source', () => {
    const profile = {
      id: 'google-user-1',
      emails: [{ value: 'Person@Example.COM', verified: true }],
    } as Profile;

    expect(createStrategy().validate('access-token', 'refresh-token', profile))
      .toEqual({
        providerId: 'google-user-1',
        email: 'Person@Example.COM',
        emailVerified: true,
      });
  });

  it('rejects profiles without a verified email', () => {
    const profile = {
      id: 'google-user-1',
      emails: [{ value: 'person@example.com', verified: false }],
    } as Profile;

    expect(() => createStrategy().validate('access-token', 'refresh-token', profile))
      .toThrow(InvalidGoogleAccountError);
  });

  it('rejects profiles without an email', () => {
    const profile = { id: 'google-user-1', emails: [] } as Profile;

    expect(() => createStrategy().validate('access-token', 'refresh-token', profile))
      .toThrow(InvalidGoogleAccountError);
  });
});
