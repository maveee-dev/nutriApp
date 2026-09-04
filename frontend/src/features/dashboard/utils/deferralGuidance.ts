import type { NutritionPolicyDeferral } from '../types/dashboard.types';

export interface DeferralGuidanceAction {
  label: string;
  to: string;
}

export interface DeferralGuidance {
  action?: DeferralGuidanceAction;
  supportingText?: string;
}

const labAction = (testCode: 'egfr' | 'potassium' | 'phosphorus', label: string, verb: 'add' | 'update'): DeferralGuidance => ({
  action: {
    label,
    to: `/health?addLab=${testCode}#laboratory-results`,
  },
  supportingText: `A ${verb === 'add' ? 'recent' : 'newer'} ${testCode === 'egfr' ? 'eGFR' : testCode} result can help personalize this guidance.`,
});

const clinicianTargetGuidance = (nutrient: string): DeferralGuidance => ({
  action: { label: `Review ${nutrient} target`, to: '/nutrition-targets' },
  supportingText: `A personalized ${nutrient} target is not set yet. Add or review one in Nutrition Targets if your healthcare team has given you a limit or goal.`,
});

export function deferralGuidance(deferral: NutritionPolicyDeferral): DeferralGuidance {
  const reason = deferral.reason.toLowerCase();

  if (reason === 'missing-weight') {
    return {
      action: { label: 'Add body weight', to: '/health#physical-metrics' },
      supportingText: 'Your current body weight is used to personalize this guidance.',
    };
  }

  if (reason === 'missing-maintenance-energy') {
    return {
      action: { label: 'Complete physical metrics', to: '/health#physical-metrics' },
      supportingText: 'Age, sex, height, weight, and activity level are used to estimate your daily energy needs.',
    };
  }

  if (['missing-egfr', 'stale-egfr', 'invalid-egfr-unit', 'invalid-egfr-value', 'unsupported-egfr'].includes(reason)) {
    return labAction('egfr', reason === 'missing-egfr' ? 'Add eGFR result' : 'Add a newer eGFR result', reason === 'missing-egfr' ? 'add' : 'update');
  }

  if (['missing-potassium', 'stale-potassium', 'invalid-potassium-unit', 'invalid-potassium-value'].includes(reason)) {
    return labAction('potassium', reason === 'missing-potassium' ? 'Add potassium result' : 'Add a newer potassium result', reason === 'missing-potassium' ? 'add' : 'update');
  }

  if (['missing-phosphorus', 'stale-phosphorus', 'invalid-phosphorus-unit', 'invalid-phosphorus-value'].includes(reason)) {
    return labAction('phosphorus', reason === 'missing-phosphorus' ? 'Add phosphorus result' : 'Add a newer phosphorus result', reason === 'missing-phosphorus' ? 'add' : 'update');
  }

  if (reason === 'missing-dialysis-status' || reason === 'stale-dialysis-evidence') {
    return {
      action: { label: 'Review dialysis status', to: '/health#dialysis-status' },
      supportingText: 'Confirm that your current dialysis treatment status and effective date are up to date.',
    };
  }

  if (reason === 'missing-dialysis-modality' || reason === 'conflicting-dialysis-modality') {
    return {
      action: { label: 'Confirm dialysis type', to: '/health#dialysis-status' },
      supportingText: 'Confirm whether your treatment is hemodialysis or peritoneal dialysis so NutriApp can apply the appropriate guidance.',
    };
  }

  if (reason.includes('individualized-carbohydrate-target')) return clinicianTargetGuidance('carbohydrate');
  if (reason.includes('individualized-potassium-target') || reason.includes('potassium-target')) return clinicianTargetGuidance('potassium');
  if (reason.includes('individualized-phosphorus-target') || reason.includes('phosphorus-target')) return clinicianTargetGuidance('phosphorus');

  if (reason === 'insufficient-historical-coverage') {
    return {
      action: { label: 'Review meal history', to: '/meals' },
      supportingText: 'Complete meal records are needed before NutriApp can summarize this period reliably.',
    };
  }

  if (reason.includes('replay') || reason.includes('mixed-evaluator') || reason.includes('mixed-policy') || reason.includes('mixed-resolved')) {
    return {
      supportingText: 'This historical guidance is limited because the saved records cannot be combined under one consistent evaluation context.',
    };
  }

  return {
    supportingText: 'This information cannot currently be completed from the app. The guidance will remain paused rather than making an assumption.',
  };
}
