CREATE TABLE "FoodPresentation" (
    "id" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "displayNameOverride" TEXT,
    "variantLabelOverride" TEXT,
    "searchPriority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodPresentation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FoodAlias" (
    "id" TEXT NOT NULL,
    "foodPresentationId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FoodPresentation_foodId_key" ON "FoodPresentation"("foodId");
CREATE INDEX "FoodPresentation_searchPriority_idx" ON "FoodPresentation"("searchPriority");
CREATE UNIQUE INDEX "FoodAlias_foodPresentationId_normalizedAlias_key" ON "FoodAlias"("foodPresentationId", "normalizedAlias");
CREATE INDEX "FoodAlias_normalizedAlias_idx" ON "FoodAlias"("normalizedAlias");

ALTER TABLE "FoodPresentation" ADD CONSTRAINT "FoodPresentation_foodId_fkey"
  FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FoodAlias" ADD CONSTRAINT "FoodAlias_foodPresentationId_fkey"
  FOREIGN KEY ("foodPresentationId") REFERENCES "FoodPresentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
