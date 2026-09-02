ALTER TABLE "DailyNutritionEntry" ALTER COLUMN "foodId" DROP NOT NULL;
ALTER TABLE "DailyNutritionEntry" ALTER COLUMN "servingId" DROP NOT NULL;
ALTER TABLE "DailyNutritionEntry" ADD COLUMN "recipeId" TEXT;
ALTER TABLE "DailyNutritionEntry" ADD COLUMN "recipeVersionId" TEXT;
ALTER TABLE "DailyNutritionEntry" ADD CONSTRAINT "DailyNutritionEntry_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "RecipeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "DailyNutritionEntry_recipeId_idx" ON "DailyNutritionEntry"("recipeId");
CREATE INDEX "DailyNutritionEntry_recipeVersionId_idx" ON "DailyNutritionEntry"("recipeVersionId");
