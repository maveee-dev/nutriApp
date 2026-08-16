ALTER TABLE "FoodCategory" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "FoodCategory" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "Food" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Food" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "Nutrient" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Nutrient" ADD COLUMN "sourceId" TEXT;

CREATE UNIQUE INDEX "FoodCategory_source_sourceId_key" ON "FoodCategory"("source", "sourceId");
CREATE UNIQUE INDEX "Food_source_sourceId_key" ON "Food"("source", "sourceId");
CREATE UNIQUE INDEX "Nutrient_source_sourceId_key" ON "Nutrient"("source", "sourceId");

DROP INDEX "FoodCategory_name_key";
DROP INDEX "Food_name_key";
DROP INDEX "Nutrient_name_key";

CREATE INDEX "FoodCategory_name_idx" ON "FoodCategory"("name");
CREATE INDEX "Nutrient_name_idx" ON "Nutrient"("name");
