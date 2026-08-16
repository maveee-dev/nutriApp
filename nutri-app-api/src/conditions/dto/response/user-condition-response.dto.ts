import { ConditionResponseDto } from './condition-response.dto.js';

export class UserConditionResponseDto {
  readonly createdAt!: Date;
  readonly condition!: ConditionResponseDto;
}
