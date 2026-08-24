import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeneratedRefreshToken {
  readonly token: string;
  readonly tokenHash: string;
  readonly familyId: string;
}

/**
 * Provider-independent refresh-token primitive. Only the keyed token digest is
 * persisted; the opaque token is returned to the caller for cookie delivery.
 */
@Injectable()
export class RefreshTokenService {
  constructor(private readonly configService: ConfigService) {}

  generate(familyId = randomBytes(16).toString('hex')): GeneratedRefreshToken {
    const token = randomBytes(32).toString('base64url');
    return { token, tokenHash: this.hash(token), familyId };
  }

  hash(token: string): string {
    return createHmac('sha256', this.secret()).update(token, 'utf8').digest('hex');
  }

  matches(token: string, tokenHash: string): boolean {
    const expected = Buffer.from(this.hash(token), 'hex');
    const actual = Buffer.from(tokenHash, 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private secret(): string {
    const secret = this.configService.get<string>('refreshTokenHashSecret');
    if (secret == null || secret.length < 32) {
      throw new Error('REFRESH_TOKEN_HASH_SECRET must be configured before refresh-token operations are activated.');
    }
    return secret;
  }
}
