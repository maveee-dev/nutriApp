CREATE TYPE "DiabetesTargetApprovalSource" AS ENUM ('USER_APPROVED', 'CLINICIAN_APPROVED');

CREATE TABLE "DiabetesCarbohydrateTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetGrams" DECIMAL(10,2) NOT NULL,
    "approvalSource" "DiabetesTargetApprovalSource" NOT NULL,
    "sourceReference" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiabetesCarbohydrateTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiabetesCarbohydrateTarget_userId_key" ON "DiabetesCarbohydrateTarget"("userId");

ALTER TABLE "DiabetesCarbohydrateTarget" ADD CONSTRAINT "DiabetesCarbohydrateTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
