import type { EmailMessage, PasswordResetEmailInput } from '../email.types.js';

export function renderPasswordResetEmail(input: PasswordResetEmailInput): EmailMessage {
  const greeting = input.recipientName == null ? 'Hello,' : `Hello ${input.recipientName},`;
  return {
    to: input.to,
    subject: 'Reset your NutriApp password',
    text: `${greeting}\n\nYour NutriApp password reset code is ${input.code}. It expires in ${input.expiresInMinutes} minutes.\n\nIf you did not request a password reset, you can ignore this email.`,
    html: `<p>${escapeHtml(greeting)}</p><p>Your NutriApp password reset code is <strong>${escapeHtml(input.code)}</strong>. It expires in ${input.expiresInMinutes} minutes.</p><p>If you did not request a password reset, you can ignore this email.</p>`,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => HTML_ESCAPES[character]);
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
};

