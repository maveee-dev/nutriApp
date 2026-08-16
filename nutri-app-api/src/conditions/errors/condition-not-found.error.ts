import { DomainNotFoundError } from "../../common/errors/domain-not-found.error.js";

export class ConditionNotFoundError extends DomainNotFoundError {
  constructor() {
    super('Condition not found');
  }
}