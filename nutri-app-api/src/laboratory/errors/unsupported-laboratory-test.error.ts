import { DomainValidationError } from '../../common/errors/domain-validation.error.js';

export class UnsupportedLaboratoryTestError extends DomainValidationError {
  constructor() {
    super('Unsupported laboratory test.');
  }
}
