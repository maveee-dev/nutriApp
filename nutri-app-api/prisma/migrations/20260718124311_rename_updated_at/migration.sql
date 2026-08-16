/*
  Warnings:

  - You are about to drop the column `UpdatedAt` on the `Condition` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Condition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Condition"
RENAME COLUMN "UpdatedAt" To "updatedAt";