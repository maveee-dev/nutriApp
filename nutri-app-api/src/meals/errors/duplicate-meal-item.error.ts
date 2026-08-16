import { DomainConflictError } from "../../common/errors/domain-conflict.error.js";

export class DuplicateMealItemError extends DomainConflictError {
  constructor() {
    super('A meal cannot contain duplicate servings');
  }
}