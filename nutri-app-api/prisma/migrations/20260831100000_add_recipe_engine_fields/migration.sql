ALTER TABLE "Recipe" ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RecipeVersion" ADD COLUMN "preparationInstructions" TEXT;
