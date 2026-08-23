import { DomainNotFoundError } from '../../../common/errors/domain-not-found.error.js';

export class RecipeNotFoundError extends DomainNotFoundError {
  constructor() {
    super('Recipe not found');
  }
}
