import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { PasswordHasher } from './password-hasher.js';

/**
 * Phase 1 compatibility adapter for the existing password format.
 * Registration and login continue using AuthService's current bcrypt path
 * until the password service is explicitly activated in a later phase.
 */
@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds = 12) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
