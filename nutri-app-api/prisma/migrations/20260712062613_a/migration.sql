/*
  Warnings:

  - The `sex` column on the `Profile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `activityLevel` column on the `Profile` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "sex",
ADD COLUMN     "sex" "Sex",
DROP COLUMN "activityLevel",
ADD COLUMN     "activityLevel" "ActivityLevel";

-- CreateTable
CREATE TABLE "Condition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCondition" (
    "userId" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCondition_pkey" PRIMARY KEY ("userId","conditionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Condition_name_key" ON "Condition"("name");

-- AddForeignKey
ALTER TABLE "UserCondition" ADD CONSTRAINT "UserCondition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCondition" ADD CONSTRAINT "UserCondition_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
