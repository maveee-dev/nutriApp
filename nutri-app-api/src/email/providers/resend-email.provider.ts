import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmailProvider } from '../email-provider.js';
import type { EmailMessage } from '../email.types.js';

interface ResendEmailRequest {
  readonly from: string;
  readonly to: readonly [string];
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
}

interface ResendErrorResponse {
  readonly message?: string;
}

/** Resend adapter; authentication decides when this provider is called. */
@Injectable()
export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly configService: ConfigService) {}

  async send(message: EmailMessage): Promise<void> {
    const apiKey = this.configService.get<string>('resendApiKey');
    const from = this.configService.get<string>('emailFrom');
    const apiUrl = this.configService.get<string>('resendApiUrl') ?? 'https://api.resend.com';

    if (apiKey == null || from == null) {
      throw new Error('RESEND_API_KEY and EMAIL_FROM must be configured before email delivery is activated.');
    }

    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html == null ? {} : { html: message.html }),
      } satisfies ResendEmailRequest),
    });

    if (response.ok) {
      return;
    }

    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as ResendErrorResponse;
      if (body.message != null && body.message.length > 0) {
        detail = body.message;
      }
    } catch {
      // Preserve the provider status when the error response is not JSON.
    }

    throw new Error(`Resend email delivery failed: ${detail}`);
  }
}

