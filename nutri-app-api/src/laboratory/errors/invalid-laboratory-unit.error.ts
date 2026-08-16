import { DomainValidationError } from '../../common/errors/domain-validation.error.js';

export class InvalidLaboratoryUnitError extends DomainValidationError {
  constructor() {
    super('Invalid unit for laboratory test.');
  }
}
