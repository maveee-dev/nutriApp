import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { UpdateDialysisStatusDto } from '../../../dialysis/dto/request/update-dialysis-status.dto.js';
import { UpdateProfileDto } from '../../../profiles/dto/request/update-profile.dto.js';

export class UserAllergyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  reaction?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UserMedicationDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateHealthProfileDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileDto)
  personal?: UpdateProfileDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDialysisStatusDto)
  dialysis?: UpdateDialysisStatusDto;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  conditionIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserAllergyDto)
  allergies?: UserAllergyDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserMedicationDto)
  medications?: UserMedicationDto[];
}
