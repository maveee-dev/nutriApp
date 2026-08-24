import { DomainUnauthorizedError } from '../../common/errors/domain-unauthorized.error.js';

export class InvalidGoogleAccountError extends DomainUnauthorizedError {
  constructor() {
    super('Google account could not be verified');
  }
}
