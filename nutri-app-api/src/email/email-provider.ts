import type { EmailMessage } from './email.types.js';

/** Provider-neutral outbound email boundary. */
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

