import type { EmailMessage, VerificationEmailInput } from '../email.types.js';

export function renderVerificationEmail(input: VerificationEmailInput): EmailMessage {
  const greeting = input.recipientName == null ? 'Hello,' : `Hello ${input.recipientName},`;
  return {
    to: input.to,
    subject: 'Verify your NutriApp email',
    text: `${greeting}\n\nYour NutriApp verification code is ${input.code}. It expires in ${input.expiresInMinutes} minutes.\n\nIf you did not create this account, you can ignore this email.`,
    html: `<p>${escapeHtml(greeting)}</p><p>Your NutriApp verification code is <strong>${escapeHtml(input.code)}</strong>. It expires in ${input.expiresInMinutes} minutes.</p><p>If you did not create this account, you can ignore this email.</p>`,
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

