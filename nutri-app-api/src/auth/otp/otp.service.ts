import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainValidationError } from '../../common/errors/domain-validation.error.js';
import { GeneratedOtp } from './otp.types.js';

/**
 * Cryptographic OTP primitive. Persistence, expiry, cooldown, attempt limits,
 * and one-time consumption remain repository/service concerns for Phase 2.
 */
@Injectable()
export class OtpService {
  private readonly length: number;

  constructor(private readonly configService: ConfigService) {
    this.length = 6;
  }

  generate(length = this.length): GeneratedOtp {
    if (!Number.isInteger(length) || length < MIN_OTP_LENGTH || length > MAX_OTP_LENGTH) {
      throw new DomainValidationError('OTP length must be between 4 and 8 digits.');
    }
    const upperBound = 10 ** length;
    const code = randomInt(0, upperBound).toString().padStart(length, '0');
    return { code, codeHash: this.hash(code) };
  }

  hash(code: string): string {
    return createHmac('sha256', this.secret()).update(code, 'utf8').digest('hex');
  }

  verify(code: string, codeHash: string): boolean {
    const expected = Buffer.from(this.hash(code), 'hex');
    const actual = Buffer.from(codeHash, 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private secret(): string {
    const secret = this.configService.get<string>('otpHashSecret');
    if (secret == null || secret.length < 32) {
      throw new Error('OTP_HASH_SECRET must be configured before OTP operations are activated.');
    }
    return secret;
  }
}

const MIN_OTP_LENGTH = 4;
const MAX_OTP_LENGTH = 8;
