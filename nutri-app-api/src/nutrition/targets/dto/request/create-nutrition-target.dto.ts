import { IsDateString, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { NUTRITION_TARGET_APPROVAL_STATUSES, NUTRITION_TARGET_KINDS, NUTRITION_TARGET_SOURCES } from '../../types/nutrition-target-management.type.js';

export class CreateNutritionTargetDto {
  @IsString()
  nutrient!: string;

  @IsOptional()
  @IsString()
  value?: string | null;

  @IsString()
  unit!: string;

  @IsIn(NUTRITION_TARGET_KINDS)
  kind!: (typeof NUTRITION_TARGET_KINDS)[number];

  @IsIn(NUTRITION_TARGET_SOURCES)
  source!: (typeof NUTRITION_TARGET_SOURCES)[number];

  @IsOptional()
  @IsIn(NUTRITION_TARGET_APPROVAL_STATUSES)
  approvalStatus?: (typeof NUTRITION_TARGET_APPROVAL_STATUSES)[number];

  @IsDateString()
  effectiveAt!: string;

  @IsOptional()
  @IsDateString()
  expirationAt?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  rangeMin?: string | null;

  @IsOptional()
  @IsString()
  rangeMax?: string | null;
}
