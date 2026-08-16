import { DomainError } from "./domain.error.js";

export abstract class DomainConflictError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}