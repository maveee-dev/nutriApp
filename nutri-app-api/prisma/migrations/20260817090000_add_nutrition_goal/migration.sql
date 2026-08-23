CREATE TYPE "NutritionGoal" AS ENUM ('MAINTENANCE', 'WEIGHT_LOSS', 'MUSCLE_GAIN', 'WEIGHT_GAIN');

ALTER TABLE "Profile" ADD COLUMN "nutritionGoal" "NutritionGoal";
