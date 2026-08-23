import { DomainNotFoundError } from '../../../common/errors/domain-not-found.error.js';

export class MealTemplateNotFoundError extends DomainNotFoundError {
  constructor() {
    super('Meal template not found');
  }
}
