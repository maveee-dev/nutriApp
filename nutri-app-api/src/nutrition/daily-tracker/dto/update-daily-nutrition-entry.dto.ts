import { IsNumberString, Matches } from 'class-validator';

export class UpdateDailyNutritionEntryDto {
  @IsNumberString()
  @Matches(/^(?!0*\.?0*$)\d+(\.\d+)?$/, { message: 'servings must be a positive number.' })
  servings!: string;
}

