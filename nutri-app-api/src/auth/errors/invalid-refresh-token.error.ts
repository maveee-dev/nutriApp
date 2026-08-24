import { DomainUnauthorizedError } from '../../common/errors/domain-unauthorized.error.js';

export class InvalidRefreshTokenError extends DomainUnauthorizedError {
  constructor() {
    super('Invalid refresh token');
  }
}

