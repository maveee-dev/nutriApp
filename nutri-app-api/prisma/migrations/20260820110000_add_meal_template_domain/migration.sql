CREATE TYPE "MealTemplateSourceType" AS ENUM ('OFFICIAL', 'USER_CREATED', 'COMMUNITY', 'AI_IMPORTED');
CREATE TYPE "MealTemplateApprovalStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "MealTemplateVisibility" AS ENUM ('PRIVATE', 'SHARED');
CREATE TYPE "MealTemplateSlotKind" AS ENUM ('FIXED', 'PARAMETERIZED');
CREATE TYPE "MealTemplateSlotRole" AS ENUM ('MAIN_DISH', 'STAPLE', 'SIDE_DISH', 'SOUP', 'FRUIT', 'DRINK');

CREATE TABLE "MealTemplate" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "visibility" "MealTemplateVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MealTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MealTemplateVersion" (
    "id" TEXT NOT NULL,
    "mealTemplateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cuisine" TEXT,
    "mealTypes" "MealType"[] NOT NULL DEFAULT ARRAY[]::"MealType"[],
    "sourceType" "MealTemplateSourceType" NOT NULL,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "sourceReference" TEXT,
    "sourceVersion" TEXT,
    "approvalStatus" "MealTemplateApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealTemplateVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MealTemplateSlot" (
    "id" TEXT NOT NULL,
    "mealTemplateVersionId" TEXT NOT NULL,
    "role" "MealTemplateSlotRole" NOT NULL,
      "kind" "MealTemplateSlotKind" NOT NULL,
      "name" TEXT NOT NULL,
      "required" BOOLEAN NOT NULL DEFAULT true,
      "allowCanonicalFoodFallback" BOOLEAN NOT NULL DEFAULT false,
      "displayOrder" INTEGER NOT NULL,
    "recipeVersionId" TEXT,
    "foodId" TEXT,
    "servingId" TEXT,
    "quantity" DECIMAL(12,4),
    "unit" "RecipeQuantityUnit",
    "notes" TEXT,
    CONSTRAINT "MealTemplateSlot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MealTemplateVersion_mealTemplateId_version_key" ON "MealTemplateVersion"("mealTemplateId", "version");
CREATE UNIQUE INDEX "MealTemplateSlot_mealTemplateVersionId_displayOrder_key" ON "MealTemplateSlot"("mealTemplateVersionId", "displayOrder");
CREATE INDEX "MealTemplate_ownerId_visibility_idx" ON "MealTemplate"("ownerId", "visibility");
CREATE INDEX "MealTemplateVersion_approvalStatus_idx" ON "MealTemplateVersion"("approvalStatus");
CREATE INDEX "MealTemplateSlot_mealTemplateVersionId_idx" ON "MealTemplateSlot"("mealTemplateVersionId");
CREATE INDEX "MealTemplateSlot_recipeVersionId_idx" ON "MealTemplateSlot"("recipeVersionId");
CREATE INDEX "MealTemplateSlot_foodId_idx" ON "MealTemplateSlot"("foodId");

ALTER TABLE "MealTemplate" ADD CONSTRAINT "MealTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealTemplateVersion" ADD CONSTRAINT "MealTemplateVersion_mealTemplateId_fkey" FOREIGN KEY ("mealTemplateId") REFERENCES "MealTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealTemplateVersion" ADD CONSTRAINT "MealTemplateVersion_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MealTemplateSlot" ADD CONSTRAINT "MealTemplateSlot_mealTemplateVersionId_fkey" FOREIGN KEY ("mealTemplateVersionId") REFERENCES "MealTemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealTemplateSlot" ADD CONSTRAINT "MealTemplateSlot_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "RecipeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MealTemplateSlot" ADD CONSTRAINT "MealTemplateSlot_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MealTemplateSlot" ADD CONSTRAINT "MealTemplateSlot_servingId_fkey" FOREIGN KEY ("servingId") REFERENCES "Serving"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
