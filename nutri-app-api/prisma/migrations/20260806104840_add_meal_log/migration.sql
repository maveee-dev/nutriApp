-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateTable
CREATE TABLE "MealLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealItem" (
    "id" TEXT NOT NULL,
    "mealLogId" TEXT NOT NULL,
    "servingId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealLog_userId_consumedAt_idx" ON "MealLog"("userId", "consumedAt");

-- CreateIndex
CREATE INDEX "MealItem_mealLogId_idx" ON "MealItem"("mealLogId");

-- CreateIndex
CREATE INDEX "MealItem_servingId_idx" ON "MealItem"("servingId");

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItem" ADD CONSTRAINT "MealItem_mealLogId_fkey" FOREIGN KEY ("mealLogId") REFERENCES "MealLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItem" ADD CONSTRAINT "MealItem_servingId_fkey" FOREIGN KEY ("servingId") REFERENCES "Serving"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
