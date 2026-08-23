import { DiabetesCarbohydrateTargetSource } from './diabetes-carbohydrate-target.type.js';

export interface DiabetesNutritionEvidence {
  readonly carbohydrateTarget: DiabetesCarbohydrateTargetSource | null;
}
