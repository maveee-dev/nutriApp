import { DomainError } from "./domain.error.js";

export abstract class DomainNotFoundError extends DomainError {
  constructor(message: string) {
    super(message)
  }
}