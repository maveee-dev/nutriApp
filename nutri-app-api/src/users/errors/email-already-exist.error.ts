import { DomainConflictError } from "../../common/errors/domain-conflict.error.js";

export class EmailAlreadyExistError extends DomainConflictError {
  constructor() {
    super('Email already exist');
  }
}