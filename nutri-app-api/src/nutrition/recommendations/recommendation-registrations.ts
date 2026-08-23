import { createDeferredPolicyRecommendationRegistration } from './policies/deferred-policy-recommendation.registration.js';
import { createSodiumRecommendationRegistration } from './sodium/sodium-recommendation.registration.js';
import { createCardiovascularSaturatedFatRecommendationRegistration } from './cardiovascular/saturated-fat-recommendation.registration.js';
import { createDiabetesCarbohydrateAdherenceRecommendationRegistration } from './diabetes/carbohydrate-adherence-recommendation.registration.js';
import { createDiabetesHistoricalCarbohydrateAdherenceRecommendationRegistration } from './diabetes/historical-carbohydrate-adherence-recommendation.registration.js';
import { createGeneralUpperLimitRecommendationRegistration } from './general/upper-limit-recommendation.registration.js';
import { AnyRecommendationPolicyRegistration } from './types/recommendation-registration.type.js';
import { createConditionTargetRecommendationRegistration } from './condition-target/condition-target-recommendation.registration.js';
import { createMealAssessmentRecommendationRegistration } from './meal-assessment/meal-assessment-recommendation.registration.js';

export function createRecommendationPolicyRegistrations(): readonly AnyRecommendationPolicyRegistration[] {
  return [
    createSodiumRecommendationRegistration(),
    createCardiovascularSaturatedFatRecommendationRegistration(),
    createDiabetesCarbohydrateAdherenceRecommendationRegistration(),
    createDiabetesHistoricalCarbohydrateAdherenceRecommendationRegistration(),
    createGeneralUpperLimitRecommendationRegistration('added-sugar', 'added sugar', 'g'),
    createGeneralUpperLimitRecommendationRegistration('cholesterol', 'cholesterol', 'mg'),
    createConditionTargetRecommendationRegistration('protein', ['ckd-non-dialysis-protein-v1', 'hemodialysis-protein-v1', 'peritoneal-dialysis-protein-v1']),
    createConditionTargetRecommendationRegistration('carbohydrates', ['diabetes-carbohydrate-target-v1']),
    createMealAssessmentRecommendationRegistration(),
    createDeferredPolicyRecommendationRegistration(),
  ];
}
