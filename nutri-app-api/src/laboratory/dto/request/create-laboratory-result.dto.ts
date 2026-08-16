import { IsDateString, IsDecimal, IsIn, IsOptional, IsString } from 'class-validator';
import { LABORATORY_TEST_CODES } from '../../types/laboratory-test-code.js';

export class CreateLaboratoryResultDto {
  @IsIn([LABORATORY_TEST_CODES.EGFR])
  testCode!: string;

  @IsDecimal()
  value!: string;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsDecimal()
  referenceLow?: string;

  @IsOptional()
  @IsDecimal()
  referenceHigh?: string;

  @IsDateString()
  collectedAt!: string;
}
