import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DialysisModality, DialysisStatus } from '../../../../generated/prisma/client.js';

export class UpdateDialysisStatusDto {
  @IsEnum(DialysisStatus)
  status!: DialysisStatus;

  @IsOptional()
  @IsEnum(DialysisModality)
  modality?: DialysisModality;

  @IsOptional()
  @IsDateString()
  effectiveAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  frequency?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  schedule?: string | null;
}
