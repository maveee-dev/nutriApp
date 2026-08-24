import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import type { Profile } from 'passport-google-oauth20';
import { InvalidGoogleAccountError } from '../errors/invalid-google-account.error.js';
import type { GoogleAccountSource } from '../types/google-account.source.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('googleClientId'),
      clientSecret: configService.getOrThrow<string>('googleClientSecret'),
      callbackURL: configService.getOrThrow<string>('googleCallbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): GoogleAccountSource {
    const email = profile.emails?.[0];

    if (email == null || email.verified !== true || profile.id.length === 0) {
      throw new InvalidGoogleAccountError();
    }

    return {
      providerId: profile.id,
      email: email.value,
      emailVerified: true,
    };
  }
}
