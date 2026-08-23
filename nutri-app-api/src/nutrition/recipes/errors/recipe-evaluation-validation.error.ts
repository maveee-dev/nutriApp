import { DomainValidationError } from '../../../common/errors/domain-validation.error.js';

export class RecipeEvaluationValidationError extends DomainValidationError {
  constructor(message: string) {
    super(message);
  }
}
