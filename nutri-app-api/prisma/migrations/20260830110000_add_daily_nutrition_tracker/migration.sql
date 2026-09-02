-- CreateTable
CREATE TABLE "DailyNutritionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyNutritionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyNutritionEntry" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "servingId" TEXT NOT NULL,
    "servings" DECIMAL(10,2) NOT NULL,
    "snapshotFoodName" TEXT NOT NULL,
    "snapshotServingName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyNutritionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyNutritionLog_userId_date_key" ON "DailyNutritionLog"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyNutritionLog_userId_date_idx" ON "DailyNutritionLog"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyNutritionEntry_dailyLogId_createdAt_idx" ON "DailyNutritionEntry"("dailyLogId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyNutritionEntry_foodId_idx" ON "DailyNutritionEntry"("foodId");

-- CreateIndex
CREATE INDEX "DailyNutritionEntry_servingId_idx" ON "DailyNutritionEntry"("servingId");

-- AddForeignKey
ALTER TABLE "DailyNutritionLog" ADD CONSTRAINT "DailyNutritionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyNutritionEntry" ADD CONSTRAINT "DailyNutritionEntry_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyNutritionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyNutritionEntry" ADD CONSTRAINT "DailyNutritionEntry_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyNutritionEntry" ADD CONSTRAINT "DailyNutritionEntry_servingId_fkey" FOREIGN KEY ("servingId") REFERENCES "Serving"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
