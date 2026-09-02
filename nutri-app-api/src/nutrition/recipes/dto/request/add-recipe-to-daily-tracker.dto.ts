import { IsNumberString, IsOptional, Matches } from 'class-validator';

export class AddRecipeToDailyTrackerDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must use YYYY-MM-DD format.' })
  date?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(/^(?!0*\.?0*$)\d+(\.\d+)?$/, { message: 'servings must be a positive number.' })
  servings?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(/^\d+$/, { message: 'version must be a positive integer.' })
  version?: string;
}
