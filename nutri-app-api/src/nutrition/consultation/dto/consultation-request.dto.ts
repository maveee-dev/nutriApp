import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { ConsultationConversationTurnDto } from './consultation-conversation-turn.dto.js';

export class ConsultationClarificationSelectionDto {
  @IsIn(['food'])
  type!: 'food';

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  originalQuestion!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  selectedStableId!: string;
}

export class ConsultationRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  question!: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  conversation?: ConsultationConversationTurnDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ConsultationClarificationSelectionDto)
  clarificationSelection?: ConsultationClarificationSelectionDto;
}
