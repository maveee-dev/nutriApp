import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email.tokens.js';
import type { EmailProvider } from './email-provider.js';
import type {
  EmailMessage,
  PasswordResetEmailInput,
  VerificationEmailInput,
} from './email.types.js';
import { renderPasswordResetEmail } from './templates/password-reset-email.template.js';
import { renderVerificationEmail } from './templates/verification-email.template.js';

/**
 * Application email service. Templates and provider selection stay outside
 * authentication services so the delivery mechanism can change independently.
 */
@Injectable()
export class EmailService {
  constructor(@Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider) {}

  send(message: EmailMessage): Promise<void> {
    return this.provider.send(message);
  }

  sendVerificationEmail(input: VerificationEmailInput): Promise<void> {
    return this.send(renderVerificationEmail(input));
  }

  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    return this.send(renderPasswordResetEmail(input));
  }
}

