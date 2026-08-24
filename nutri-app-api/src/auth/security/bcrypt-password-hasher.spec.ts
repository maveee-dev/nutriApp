import { BcryptPasswordHasher } from './bcrypt-password-hasher.js';

describe('BcryptPasswordHasher', () => {
  it('hashes and verifies passwords using the existing password format', async () => {
    const hasher = new BcryptPasswordHasher(4);
    const hash = await hasher.hash('correct horse battery staple');

    await expect(hasher.verify('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(hasher.verify('wrong password', hash)).resolves.toBe(false);
    expect(hash).not.toContain('correct horse battery staple');
  });
});
