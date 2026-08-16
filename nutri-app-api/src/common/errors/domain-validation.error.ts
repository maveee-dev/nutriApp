import { DomainError } from "./domain.error.js";

export class DomainValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}