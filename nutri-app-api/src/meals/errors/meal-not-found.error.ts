import { DomainNotFoundError } from "../../common/errors/domain-not-found.error.js";

export class MealNotFoundError extends DomainNotFoundError {
  constructor() {
    super('Meal not found');
  }
}