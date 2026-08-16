import { DomainUnauthorizedError } from '../../common/errors/domain-unauthorized.error.js';

export class InvalidCredentialsError extends DomainUnauthorizedError {
  constructor() {
    super('Invalid credentials');
  }
}
