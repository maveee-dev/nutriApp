import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service.js';

describe('OtpService', () => {
  const service = new OtpService(new ConfigService({ otpHashSecret: 'a'.repeat(32) }));

  it('generates a numeric OTP and verifies only the matching code', () => {
    const generated = service.generate();

    expect(generated.code).toMatch(/^\d{6}$/);
    expect(generated.codeHash).not.toBe(generated.code);
    expect(service.verify(generated.code, generated.codeHash)).toBe(true);
    expect(service.verify('000000', generated.codeHash)).toBe(generated.code === '000000');
  });

  it('rejects unsafe OTP lengths', () => {
    expect(() => service.generate(3)).toThrow('OTP length must be between 4 and 8 digits.');
    expect(() => service.generate(9)).toThrow('OTP length must be between 4 and 8 digits.');
  });
});
