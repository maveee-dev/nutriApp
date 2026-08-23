import { DomainValidationError } from '../../common/errors/domain-validation.error.js';

export class InvalidLaboratoryValueError extends DomainValidationError {
  constructor() {
    super('Invalid value for laboratory test.');
  }
}
