import type { NutritionTargetManagementSource } from '../../types/nutrition-target-management.type.js';

export class NutritionTargetResponseDto {
  id!: string;
  nutrient!: string;
  value!: string | null;
  unit!: string;
  kind!: NutritionTargetManagementSource['kind'];
  source!: NutritionTargetManagementSource['source'];
  approvalStatus!: NutritionTargetManagementSource['approvalStatus'];
  effectiveAt!: Date;
  expirationAt!: Date | null;
  version!: number;
  notes!: string | null;
  rangeMin!: string | null;
  rangeMax!: string | null;
}
