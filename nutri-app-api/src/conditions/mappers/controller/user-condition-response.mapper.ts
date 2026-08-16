import { UserConditionResponseDto } from '../../dto/response/user-condition-response.dto.js';
import { UserConditionSource } from '../../sources/user-condition.source.js';
import { ConditionResponseMapper } from './condition-response.mapper.js';

export class UserConditionResponseMapper {
  static toUserConditionResponseDto(source: UserConditionSource): UserConditionResponseDto {
    return {
      createdAt: source.createdAt,
      condition: ConditionResponseMapper.toConditionResponseDto(source.condition),
    };
  }
}
