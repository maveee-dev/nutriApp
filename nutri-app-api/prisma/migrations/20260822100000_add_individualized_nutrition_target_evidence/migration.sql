CREATE TYPE "NutritionTargetEvidenceApprovalSource" AS ENUM ('USER_APPROVED', 'CLINICIAN_APPROVED');

CREATE TYPE "NutritionTargetEvidenceKind" AS ENUM ('UPPER_LIMIT', 'LOWER_TARGET');

CREATE TABLE "IndividualizedNutritionTargetEvidence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nutrientKey" TEXT NOT NULL,
    "kind" "NutritionTargetEvidenceKind" NOT NULL,
    "targetValue" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "approvalSource" "NutritionTargetEvidenceApprovalSource" NOT NULL,
    "sourceReference" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndividualizedNutritionTargetEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IndividualizedNutritionTargetEvidence_userId_nutrientKey_version_key"
ON "IndividualizedNutritionTargetEvidence"("userId", "nutrientKey", "version");

CREATE INDEX "IndividualizedNutritionTargetEvidence_userId_nutrientKey_effectiveAt_idx"
ON "IndividualizedNutritionTargetEvidence"("userId", "nutrientKey", "effectiveAt");

CREATE INDEX "IndividualizedNutritionTargetEvidence_userId_nutrientKey_expiresAt_idx"
ON "IndividualizedNutritionTargetEvidence"("userId", "nutrientKey", "expiresAt");

ALTER TABLE "IndividualizedNutritionTargetEvidence"
ADD CONSTRAINT "IndividualizedNutritionTargetEvidence_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
