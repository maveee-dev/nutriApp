export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
}

export interface VerificationEmailInput {
  readonly to: string;
  readonly code: string;
  readonly expiresInMinutes: number;
  readonly recipientName?: string;
}

export interface PasswordResetEmailInput {
  readonly to: string;
  readonly code: string;
  readonly expiresInMinutes: number;
  readonly recipientName?: string;
}

