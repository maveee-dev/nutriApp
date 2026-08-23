CREATE TABLE "MealItemEvaluationSnapshot" (
    "id" TEXT NOT NULL,
    "mealItemId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "coverage" DOUBLE PRECISION NOT NULL,
    "payload" JSONB NOT NULL,
    "evaluatorVersion" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "snapshotVersion" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealItemEvaluationSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MealItemEvaluationSnapshot_mealItemId_evaluatedAt_idx" ON "MealItemEvaluationSnapshot"("mealItemId", "evaluatedAt");
CREATE INDEX "MealItemEvaluationSnapshot_evaluatorVersion_policyVersion_idx" ON "MealItemEvaluationSnapshot"("evaluatorVersion", "policyVersion");

ALTER TABLE "MealItemEvaluationSnapshot" ADD CONSTRAINT "MealItemEvaluationSnapshot_mealItemId_fkey" FOREIGN KEY ("mealItemId") REFERENCES "MealItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
