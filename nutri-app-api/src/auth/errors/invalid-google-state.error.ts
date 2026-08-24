import { DomainUnauthorizedError } from '../../common/errors/domain-unauthorized.error.js';

export class InvalidGoogleStateError extends DomainUnauthorizedError {
  constructor() {
    super('Invalid Google OAuth state');
  }
}
