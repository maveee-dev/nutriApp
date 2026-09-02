ALTER TYPE "NutritionTargetEvidenceApprovalSource" ADD VALUE IF NOT EXISTS 'SYSTEM_SUGGESTED';
ALTER TYPE "NutritionTargetEvidenceApprovalSource" ADD VALUE IF NOT EXISTS 'IMPORTED';
ALTER TYPE "NutritionTargetEvidenceKind" ADD VALUE IF NOT EXISTS 'RANGE';

CREATE TYPE "NutritionTargetApprovalStatus" AS ENUM ('SUGGESTED', 'APPROVED', 'DISMISSED');

ALTER TABLE "IndividualizedNutritionTargetEvidence"
  ALTER COLUMN "targetValue" DROP NOT NULL,
  ADD COLUMN "approvalStatus" "NutritionTargetApprovalStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "rangeMin" DECIMAL(12,4),
  ADD COLUMN "rangeMax" DECIMAL(12,4),
  ADD COLUMN "notes" TEXT;

CREATE TABLE "UserAllergy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reaction" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAllergy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserAllergy_userId_name_idx" ON "UserAllergy"("userId", "name");

ALTER TABLE "UserAllergy"
ADD CONSTRAINT "UserAllergy_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserMedication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMedication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserMedication_userId_name_idx" ON "UserMedication"("userId", "name");

ALTER TABLE "UserMedication"
ADD CONSTRAINT "UserMedication_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserDialysisStatus"
  ADD COLUMN "frequency" TEXT,
  ADD COLUMN "schedule" TEXT;
