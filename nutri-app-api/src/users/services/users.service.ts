import { Injectable } from '@nestjs/common';
import { PaginatedResponseSource } from '../../common/pagination/offset/types/paginated-response-source.type.js';
import { createPaginationMeta } from '../../common/utils/pagination.util.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { UserAuthSource } from '../sources/user-auth.source.js';
import { UserSource } from '../sources/user.source.js';
import { UserVerificationSource } from '../sources/user-verification.source.js';
import { FindUsersOptions } from '../types/find-users.option.js';
import { FindUsersInput } from '../types/find-users.input.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findByEmail(email: string): Promise<UserSource | null> {
    return this.usersRepository.findByEmail(email);
  }

  findByEmailWithPassword(email: string): Promise<UserAuthSource | null> {
    return this.usersRepository.findByEmailWithPassword(email);
  }

  findByEmailWithVerification(email: string): Promise<UserVerificationSource | null> {
    return this.usersRepository.findByEmailWithVerification(email);
  }

  findById(id: string): Promise<UserSource | null> {
    return this.usersRepository.findById(id);
  }

  async findMany(
    input: FindUsersInput,
  ): Promise<PaginatedResponseSource<UserSource>> {
    const skip = (input.page - 1) * input.limit;
    const options: FindUsersOptions = {
      search: input.search,
      skip,
      take: input.limit,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    };

    const { items, totalItems } =
      await this.usersRepository.findManyWithCount(options);

    return {
      items,
      meta: createPaginationMeta(input.page, input.limit, totalItems),
    };
  }

  create(email: string, password: string, emailVerifiedAt: Date | null = null): Promise<UserSource> {
    return this.usersRepository.create({ email, password, emailVerifiedAt });
  }

  markEmailVerified(userId: string, emailVerifiedAt = new Date()): Promise<boolean> {
    return this.usersRepository.markEmailVerified(userId, emailVerifiedAt);
  }
}
