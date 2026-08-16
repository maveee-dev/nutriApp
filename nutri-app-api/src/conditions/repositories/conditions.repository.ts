import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { FindManyResult } from '../../common/interfaces/find-many-result.interface.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ConditionAlreadyAssignedError } from '../errors/condition-already-assigned.error.js';
import { ConditionNotFoundError } from '../errors/condition-not-found.error.js';
import { UserConditionNotFoundError } from '../errors/user-condition-not-found.error.js';
import { ConditionRepositoryMapper } from '../mappers/repository/condition-repository.mapper.js';
import { UserConditionRepositoryMapper } from '../mappers/repository/user-condition-repository.mapper.js';
import { ConditionSource } from '../sources/condition.source.js';
import { UserConditionSource } from '../sources/user-condition.source.js';
import { FindConditionsOptions } from '../types/find-conditions.option.js';

@Injectable()
export class ConditionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(options: FindConditionsOptions): Promise<ConditionSource[]> {
    const conditions = await this.prisma.condition.findMany({
      where: this.toWhere(options),
      skip: options.skip,
      take: options.take,
      orderBy: this.buildConditionOrderBy(options),
    });
    return conditions.map(ConditionRepositoryMapper.toConditionSource);
  }

  async findManyWithCount(options: FindConditionsOptions): Promise<FindManyResult<ConditionSource>> {
    const where = this.toWhere(options);
    const [conditions, totalItems] = await Promise.all([
      this.prisma.condition.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: this.buildConditionOrderBy(options),
      }),
      this.prisma.condition.count({ where }),
    ]);
    return { items: conditions.map(ConditionRepositoryMapper.toConditionSource), totalItems };
  }

  async findUserConditionsWithCount(userId: string, options: FindConditionsOptions): Promise<FindManyResult<UserConditionSource>> {
    const where = this.toUserConditionWhere(userId, options);
    const [userConditions, totalItems] = await Promise.all([
      this.prisma.userCondition.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: this.buildUserConditionOrderBy(options),
        include: { condition: true },
      }),
      this.prisma.userCondition.count({ where }),
    ]);
    return { items: userConditions.map(UserConditionRepositoryMapper.toUserConditionSource), totalItems };
  }

  async findUserConditions(userId: string): Promise<UserConditionSource[]> {
    const userConditions = await this.prisma.userCondition.findMany({
      where: { userId },
      include: { condition: true },
    });
    return userConditions.map(UserConditionRepositoryMapper.toUserConditionSource);
  }

  async addToUser(userId: string, conditionId: string): Promise<UserConditionSource> {
    try {
      const userCondition = await this.prisma.userCondition.create({
        data: { userId, conditionId },
        include: { condition: true },
      });
      return UserConditionRepositoryMapper.toUserConditionSource(userCondition);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConditionAlreadyAssignedError();
        if (error.code === 'P2003') throw new ConditionNotFoundError();
      }
      throw error;
    }
  }

  async removeFromUser(userId: string, conditionId: string): Promise<void> {
    try {
      await this.prisma.userCondition.delete({
        where: { userId_conditionId: { userId, conditionId } },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new UserConditionNotFoundError();
      }
      throw error;
    }
  }

  private toWhere(options: FindConditionsOptions): Prisma.ConditionWhereInput {
    if (!options.search) return {};
    return { OR: [
      { name: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ] };
  }

  private toUserConditionWhere(userId: string, options: FindConditionsOptions): Prisma.UserConditionWhereInput {
    const where: Prisma.UserConditionWhereInput = { userId };
    if (options.search) {
      where.OR = [
        { condition: { name: { contains: options.search, mode: 'insensitive' } } },
        { condition: { description: { contains: options.search, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  private buildConditionOrderBy(options: FindConditionsOptions): Prisma.ConditionOrderByWithRelationInput {
    return { [options.sortBy ?? 'createdAt']: options.sortOrder ?? 'asc' };
  }

  private buildUserConditionOrderBy(options: FindConditionsOptions): Prisma.UserConditionOrderByWithRelationInput {
    return { [options.sortBy ?? 'createdAt']: options.sortOrder ?? 'asc' };
  }
}
