import { IsIn, IsOptional } from 'class-validator';
import { LABORATORY_TEST_CODES } from '../../types/laboratory-test-code.js';

export class FindLaboratoryResultsDto {
  @IsOptional()
  @IsIn([LABORATORY_TEST_CODES.EGFR, LABORATORY_TEST_CODES.POTASSIUM])
  testCode?: string;
}
