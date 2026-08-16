-- CreateTable
CREATE TABLE "FoodCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Serving" (
    "id" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grams" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Serving_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nutrient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nutrient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodNutrient" (
    "foodId" TEXT NOT NULL,
    "nutrientId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "FoodNutrient_pkey" PRIMARY KEY ("foodId","nutrientId")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodCategory_name_key" ON "FoodCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Food_name_key" ON "Food"("name");

-- CreateIndex
CREATE INDEX "Food_categoryId_idx" ON "Food"("categoryId");

-- CreateIndex
CREATE INDEX "Food_name_idx" ON "Food"("name");

-- CreateIndex
CREATE INDEX "Serving_foodId_idx" ON "Serving"("foodId");

-- CreateIndex
CREATE UNIQUE INDEX "Serving_foodId_name_key" ON "Serving"("foodId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Nutrient_name_key" ON "Nutrient"("name");

-- CreateIndex
CREATE INDEX "FoodNutrient_foodId_idx" ON "FoodNutrient"("foodId");

-- CreateIndex
CREATE INDEX "FoodNutrient_nutrientId_idx" ON "FoodNutrient"("nutrientId");

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FoodCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Serving" ADD CONSTRAINT "Serving_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodNutrient" ADD CONSTRAINT "FoodNutrient_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodNutrient" ADD CONSTRAINT "FoodNutrient_nutrientId_fkey" FOREIGN KEY ("nutrientId") REFERENCES "Nutrient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
