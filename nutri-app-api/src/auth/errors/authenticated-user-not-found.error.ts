import { DomainNotFoundError } from '../../common/errors/domain-not-found.error.js';

export class AuthenticatedUserNotFoundError extends DomainNotFoundError {
  constructor() {
    super('User does not exist');
  }
}
