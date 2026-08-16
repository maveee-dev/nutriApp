import { DomainValidationError } from "../../common/errors/domain-validation.error.js";

export class EmptyMealError extends DomainValidationError {
  constructor() {
    super('A meal must contain atleast one item');
  }
}