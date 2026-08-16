import { ConditionResponseDto } from '../../dto/response/condition-response.dto.js';
import { ConditionSource } from '../../sources/condition.source.js';

export class ConditionResponseMapper {
  static toConditionResponseDto(source: ConditionSource): ConditionResponseDto {
    return { id: source.id, name: source.name, description: source.description };
  }
}
