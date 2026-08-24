import { DomainUnauthorizedError } from '../../common/errors/domain-unauthorized.error.js';

export class InvalidEmailVerificationError extends DomainUnauthorizedError {
  constructor() {
    super('Invalid or expired verification code');
  }
}

