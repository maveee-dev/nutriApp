import { ActivityLevel, NutritionGoal, Sex } from '../../../generated/prisma/client.js';

export interface UpdateProfileData {
  age?: number;
  sex?: Sex;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
  nutritionGoal?: NutritionGoal;
}
