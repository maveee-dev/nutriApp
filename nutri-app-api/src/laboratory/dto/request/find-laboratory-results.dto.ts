import { IsIn, IsOptional } from 'class-validator';
import { SUPPORTED_LABORATORY_TEST_CODES } from '../../types/laboratory-test-code.js';

export class FindLaboratoryResultsDto {
  @IsOptional()
  @IsIn(SUPPORTED_LABORATORY_TEST_CODES)
  testCode?: string;
}
