import { DomainNotFoundError } from '../../../common/errors/domain-not-found.error.js';

export class FoodNotFoundError extends DomainNotFoundError {
  constructor() {
    super('Food not found');
  }
}
