import { DomainConflictError } from '../../common/errors/domain-conflict.error.js';

export class AuthEmailAlreadyExistsError extends DomainConflictError {
  constructor() {
    super('Conflict');
  }
}
