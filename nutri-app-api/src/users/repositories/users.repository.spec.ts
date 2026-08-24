import { jest } from '@jest/globals';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersRepository } from './users.repository.js';

describe('UsersRepository', () => {
  it('creates an empty profile atomically with a new user', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
      createdAt: new Date('2026-08-22T00:00:00.000Z'),
    });
    const prisma = { user: { create } } as unknown as PrismaService;
    const repository = new UsersRepository(prisma);

    await expect(repository.create({ email: 'new@example.com', password: 'hashed-password' })).resolves.toEqual({
      id: 'user-1',
      email: 'new@example.com',
      createdAt: new Date('2026-08-22T00:00:00.000Z'),
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        password: 'hashed-password',
        emailVerifiedAt: null,
        profile: { create: {} },
      },
    });
  });
});
