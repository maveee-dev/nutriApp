import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsDecimal, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CreateLaboratoryReportResultDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  testCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  testName?: string;

  @IsDecimal()
  value!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @IsOptional()
  @IsDecimal()
  referenceLow?: string;

  @IsOptional()
  @IsDecimal()
  referenceHigh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  flag?: string;
}

export class CreateLaboratoryReportDto {
  @IsDateString()
  reportDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateLaboratoryReportResultDto)
  results!: CreateLaboratoryReportResultDto[];
}
