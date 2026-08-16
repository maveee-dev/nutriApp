import { DomainError } from "./domain.error.js";

export abstract class DomainUnauthorizedError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}  