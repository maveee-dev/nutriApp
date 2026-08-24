import { DomainUnauthorizedError } from '../../common/errors/domain-unauthorized.error.js';

export class InvalidPasswordResetError extends DomainUnauthorizedError {
  constructor() {
    super('Invalid or expired password reset code');
  }
}
