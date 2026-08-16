import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { DialysisStatus } from '../../../../generated/prisma/client.js';

export class UpdateDialysisStatusDto {
  @IsEnum(DialysisStatus)
  status!: DialysisStatus;

  @IsOptional()
  @IsDateString()
  effectiveAt?: string;
}
