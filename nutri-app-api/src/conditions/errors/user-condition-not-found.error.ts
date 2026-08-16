import { DomainNotFoundError } from "../../common/errors/domain-not-found.error.js";

export class UserConditionNotFoundError extends DomainNotFoundError {
  constructor() {
    super('Condition is not assigned to this user');
  }
}