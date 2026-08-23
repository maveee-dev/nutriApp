CREATE TYPE "RecipeSourceType" AS ENUM ('OFFICIAL', 'USER_CREATED', 'COMMUNITY', 'AI_IMPORTED');
CREATE TYPE "RecipeApprovalStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "RecipeVisibility" AS ENUM ('PRIVATE', 'SHARED');
CREATE TYPE "RecipeComponentRole" AS ENUM ('MAIN_DISH', 'STAPLE', 'SIDE_DISH', 'SOUP', 'FRUIT', 'DRINK', 'INGREDIENT');
CREATE TYPE "RecipeQuantityUnit" AS ENUM ('SERVING', 'GRAM');

CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "visibility" "RecipeVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipeVersion" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cuisine" TEXT,
    "mealTypes" "MealType"[] NOT NULL DEFAULT ARRAY[]::"MealType"[],
    "yieldServings" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "sourceType" "RecipeSourceType" NOT NULL,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "sourceReference" TEXT,
    "sourceVersion" TEXT,
    "approvalStatus" "RecipeApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecipeVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipeComponent" (
    "id" TEXT NOT NULL,
    "recipeVersionId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "servingId" TEXT,
    "role" "RecipeComponentRole" NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" "RecipeQuantityUnit" NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "notes" TEXT,
    CONSTRAINT "RecipeComponent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecipeVersion_recipeId_version_key" ON "RecipeVersion"("recipeId", "version");
CREATE UNIQUE INDEX "RecipeComponent_recipeVersionId_displayOrder_key" ON "RecipeComponent"("recipeVersionId", "displayOrder");
CREATE INDEX "Recipe_ownerId_visibility_idx" ON "Recipe"("ownerId", "visibility");
CREATE INDEX "RecipeVersion_approvalStatus_idx" ON "RecipeVersion"("approvalStatus");
CREATE INDEX "RecipeComponent_foodId_idx" ON "RecipeComponent"("foodId");
CREATE INDEX "RecipeComponent_recipeVersionId_idx" ON "RecipeComponent"("recipeVersionId");

ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeVersion" ADD CONSTRAINT "RecipeVersion_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeVersion" ADD CONSTRAINT "RecipeVersion_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "RecipeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_servingId_fkey" FOREIGN KEY ("servingId") REFERENCES "Serving"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
