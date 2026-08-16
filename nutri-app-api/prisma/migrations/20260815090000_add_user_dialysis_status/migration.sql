-- CreateEnum
CREATE TYPE "DialysisStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "UserDialysisStatus" (
    "userId" TEXT NOT NULL,
    "status" "DialysisStatus" NOT NULL,
    "effectiveAt" TIMESTAMP(3),
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDialysisStatus_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserDialysisStatus" ADD CONSTRAINT "UserDialysisStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
