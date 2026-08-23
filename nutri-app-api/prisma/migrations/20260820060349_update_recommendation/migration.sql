-- AlterTable
ALTER TABLE "MealTemplateSlot" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "RecipeVersion" ALTER COLUMN "mealTypes" DROP DEFAULT;
