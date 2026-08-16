import { UserConditionWithCondition } from '../../repositories/condition.prisma.js';
import { UserConditionSource } from '../../sources/user-condition.source.js';
import { ConditionRepositoryMapper } from './condition-repository.mapper.js';

export class UserConditionRepositoryMapper {
  static toUserConditionSource(row: UserConditionWithCondition): UserConditionSource {
    return {
      createdAt: row.createdAt,
      condition: ConditionRepositoryMapper.toConditionSource(row.condition),
    };
  }
}
