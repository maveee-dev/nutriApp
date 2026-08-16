import { DomainConflictError } from "../../common/errors/domain-conflict.error.js";

export class ConditionAlreadyAssignedError extends DomainConflictError {
  constructor() {
    super('Condition is already assigned to this user');
  }
}