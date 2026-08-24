import { jest } from '@jest/globals';
import { EmailService } from './email.service.js';
import type { EmailMessage } from './email.types.js';

describe('EmailService', () => {
  it('renders and delegates verification email delivery to the provider', async () => {
    const sent: EmailMessage[] = [];
    const provider = { send: async (message: EmailMessage) => void sent.push(message) };
    const service = new EmailService(provider);

    await service.sendVerificationEmail({
      to: 'person@example.com',
      code: '123456',
      expiresInMinutes: 10,
      recipientName: 'A & B',
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: 'person@example.com',
      subject: 'Verify your NutriApp email',
    });
    expect(sent[0].text).toContain('123456');
    expect(sent[0].html).toContain('A &amp; B');
  });

  it('renders password reset email without making provider-specific assumptions', async () => {
    const provider = { send: jest.fn(async () => undefined) };
    const service = new EmailService(provider);

    await service.sendPasswordResetEmail({
      to: 'person@example.com',
      code: '987654',
      expiresInMinutes: 10,
    });

    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'Reset your NutriApp password',
      text: expect.stringContaining('987654'),
    }));
  });
});
