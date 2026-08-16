import { DomainNotFoundError } from '../../common/errors/domain-not-found.error.js';

export class ProfileNotFoundError extends DomainNotFoundError {
  constructor() {
    super('Profile not found');
  }
}
