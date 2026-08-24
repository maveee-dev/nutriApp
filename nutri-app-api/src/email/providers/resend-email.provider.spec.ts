import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { ResendEmailProvider } from './resend-email.provider.js';

describe('ResendEmailProvider', () => {
  const message = {
    to: 'person@example.com',
    subject: 'Test message',
    text: 'Hello',
    html: '<p>Hello</p>',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the expected Resend request without calling the real provider', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-id' }), { status: 200 }),
    );
    const provider = new ResendEmailProvider(new ConfigService({
      resendApiKey: 're_test_key',
      emailFrom: 'NutriApp <no-reply@example.com>',
      resendApiUrl: 'https://api.example.test',
    }));

    await provider.send(message);

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/emails', expect.objectContaining({
      method: 'POST',
      headers: {
        Authorization: 'Bearer re_test_key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NutriApp <no-reply@example.com>',
        to: ['person@example.com'],
        subject: 'Test message',
        text: 'Hello',
        html: '<p>Hello</p>',
      }),
    }));
  });

  it('fails before making a request when provider configuration is absent', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    const provider = new ResendEmailProvider(new ConfigService());

    await expect(provider.send(message)).rejects.toThrow('RESEND_API_KEY and EMAIL_FROM');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces provider failures without leaking the API key', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'invalid from address' }), { status: 422 }),
    );
    const provider = new ResendEmailProvider(new ConfigService({
      resendApiKey: 'secret-test-key',
      emailFrom: 'NutriApp <no-reply@example.com>',
    }));

    await expect(provider.send(message)).rejects.toThrow('invalid from address');
    await expect(provider.send(message)).rejects.not.toThrow('secret-test-key');
  });
});
