import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ConsultationConversationTurnDto } from './consultation-conversation-turn.dto.js';

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
}
