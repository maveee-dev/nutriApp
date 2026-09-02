import { Injectable, Logger } from '@nestjs/common';
import { PaginatedResponseSource } from '../../common/pagination/offset/types/paginated-response-source.type.js';
import { createPaginationMeta } from '../../common/utils/pagination.util.js';
import { ConditionsRepository } from '../repositories/conditions.repository.js';
import { ConditionSource } from '../sources/condition.source.js';
import { UserConditionSource } from '../sources/user-condition.source.js';
import { FindConditionsInput } from '../types/find-conditions.input.js';
import { FindConditionsOptions } from '../types/find-conditions.option.js';

@Injectable()
export class ConditionsService {
  private readonly logger = new Logger(ConditionsService.name);

  constructor(private readonly conditionsRepository: ConditionsRepository) {}

  async listConditions(input: FindConditionsInput): Promise<PaginatedResponseSource<ConditionSource>> {
    const options: FindConditionsOptions = {
      search: input.search,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    };
    const { items, totalItems } = await this.conditionsRepository.findManyWithCount(options);
    return { items, meta: createPaginationMeta(input.page, input.limit, totalItems) };
  }

  async getMyConditions(userId: string, input: FindConditionsInput): Promise<PaginatedResponseSource<UserConditionSource>> {
    const options: FindConditionsOptions = {
      search: input.search,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    };
    const { items, totalItems } = await this.conditionsRepository.findUserConditionsWithCount(userId, options);
    return { items, meta: createPaginationMeta(input.page, input.limit, totalItems) };
  }

  async addMyCondition(userId: string, conditionId: string): Promise<UserConditionSource> {
    const result = await this.conditionsRepository.addToUser(userId, conditionId);
    this.logger.log(`Condition added: user=${userId}, condition=${conditionId}`);
    return result;
  }

  async removeMyCondition(userId: string, conditionId: string): Promise<void> {
    await this.conditionsRepository.removeFromUser(userId, conditionId);
    this.logger.log(`Condition removed: user=${userId}, condition=${conditionId}`);
  }

  replaceMyConditions(userId: string, conditionIds: readonly string[]): Promise<UserConditionSource[]> {
    return this.conditionsRepository.replaceForUser(userId, conditionIds);
  }
}
