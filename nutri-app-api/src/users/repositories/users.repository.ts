import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { FindManyResult } from '../../common/interfaces/find-many-result.interface.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailAlreadyExistError } from '../errors/email-already-exist.error.js';
import { UserRepositoryMapper } from '../mappers/repository/user-repository.mapper.js';
import { UserAuthSource } from '../sources/user-auth.source.js';
import { UserSource } from '../sources/user.source.js';
import { FindUsersOptions } from '../types/find-users.option.js';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserSource | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    return user ? UserRepositoryMapper.toUserSource(user) : null;
  }

  findByEmailWithPassword(email: string): Promise<UserAuthSource | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<UserSource | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    return user ? UserRepositoryMapper.toUserSource(user) : null;
  }

  async findMany(options: FindUsersOptions): Promise<UserSource[]> {
    const users = await this.prisma.user.findMany({
      where: this.buildWhere(options),
      skip: options.skip,
      take: options.take,
      orderBy: this.buildOrderBy(options),
    });

    return users.map(UserRepositoryMapper.toUserSource);
  }

  async findManyWithCount(
    options: FindUsersOptions,
  ): Promise<FindManyResult<UserSource>> {
    const where = this.buildWhere(options);
    const orderBy = this.buildOrderBy(options);

    const [users, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map(UserRepositoryMapper.toUserSource),
      totalItems,
    };
  }

  async create(data: Prisma.UserCreateInput): Promise<UserSource> {
    try {
      const user = await this.prisma.user.create({
        data: {
          ...data,
          profile: { create: {} },
        },
      });

      return UserRepositoryMapper.toUserSource(user);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new EmailAlreadyExistError();
      }

      throw error;
    }
  }

  private buildWhere(options: FindUsersOptions): Prisma.UserWhereInput {
    if (!options.search) {
      return {};
    }

    return {
      email: {
        contains: options.search,
        mode: 'insensitive',
      },
    };
  }

  private buildOrderBy(
    options: FindUsersOptions,
  ): Prisma.UserOrderByWithRelationInput {
    return {
      [options.sortBy ?? 'email']: options.sortOrder ?? 'asc',
    };
  }
}
