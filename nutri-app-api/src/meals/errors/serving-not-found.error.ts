import { DomainNotFoundError } from "../../common/errors/domain-not-found.error.js";

export class ServingNotFoundError extends DomainNotFoundError {
  constructor() {
    super('Serving not found');
  }
}