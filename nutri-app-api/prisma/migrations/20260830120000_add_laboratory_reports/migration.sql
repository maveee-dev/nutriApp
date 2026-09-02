-- CreateTable
CREATE TABLE "LaboratoryReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaboratoryReport_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "LaboratoryResult"
    ADD COLUMN "reportId" TEXT,
    ADD COLUMN "testName" TEXT,
    ADD COLUMN "flag" TEXT;

-- CreateIndex
CREATE INDEX "LaboratoryReport_userId_reportDate_idx" ON "LaboratoryReport"("userId", "reportDate");
CREATE INDEX "LaboratoryResult_reportId_idx" ON "LaboratoryResult"("reportId");

-- AddForeignKey
ALTER TABLE "LaboratoryReport"
    ADD CONSTRAINT "LaboratoryReport_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LaboratoryResult"
    ADD CONSTRAINT "LaboratoryResult_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "LaboratoryReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
