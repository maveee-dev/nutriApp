import { DomainNotFoundError } from "../../common/errors/domain-not-found.error.js";

export class EmailNotFoundError extends DomainNotFoundError {
  constructor() {
    super('Email not found');
  }
}