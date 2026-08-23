import { ActivityLevel, NutritionGoal, Sex } from '../../../../generated/prisma/client.js';

export class ProfileResponseDto {
  readonly id!: string;
  readonly age!: number | null;
  readonly sex!: Sex | null;
  readonly heightCm!: number | null;
  readonly weightKg!: number | null;
  readonly activityLevel!: ActivityLevel | null;
  readonly nutritionGoal!: NutritionGoal | null;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
  readonly userId!: string;
}
