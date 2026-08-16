import { Condition as PrismaCondition } from '../../../../generated/prisma/client.js';
import { ConditionSource } from '../../sources/condition.source.js';
import { toConditionCode } from '../../types/condition-code.js';

export class ConditionRepositoryMapper {
  static toConditionSource(row: PrismaCondition): ConditionSource {
    return {
      id: row.id,
      code: toConditionCode(row.name),
      name: row.name,
      description: row.description,
    };
  }
}
