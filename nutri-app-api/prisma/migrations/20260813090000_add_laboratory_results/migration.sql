-- CreateTable
CREATE TABLE "LaboratoryResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testCode" TEXT NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "referenceLow" DECIMAL(12,4),
    "referenceHigh" DECIMAL(12,4),
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaboratoryResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LaboratoryResult_userId_collectedAt_idx" ON "LaboratoryResult"("userId", "collectedAt");

-- CreateIndex
CREATE INDEX "LaboratoryResult_userId_testCode_collectedAt_idx" ON "LaboratoryResult"("userId", "testCode", "collectedAt");

-- AddForeignKey
ALTER TABLE "LaboratoryResult" ADD CONSTRAINT "LaboratoryResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
