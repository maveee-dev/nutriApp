import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { DialysisModality, DialysisStatus } from '../../../../generated/prisma/client.js';

export class UpdateDialysisStatusDto {
  @IsEnum(DialysisStatus)
  status!: DialysisStatus;

  @IsOptional()
  @IsEnum(DialysisModality)
  modality?: DialysisModality;

  @IsOptional()
  @IsDateString()
  effectiveAt?: string;
}
