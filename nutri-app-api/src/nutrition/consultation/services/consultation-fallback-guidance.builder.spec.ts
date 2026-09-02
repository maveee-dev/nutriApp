import { ConsultationFallbackGuidanceBuilder } from './consultation-fallback-guidance.builder.js';
import type { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';

describe('ConsultationFallbackGuidanceBuilder', () => {
  const builder = new ConsultationFallbackGuidanceBuilder();
  const baseSummary = {
    date: '2026-08-19',
    mealCount: 1,
    totals: [],
    targets: { sodiumMilligrams: '2300', proteinGrams: null },
    insights: [],
    deferredPolicies: [],
    caloriesConsumedKcal: null,
    remainingCaloriesKcal: null,
    calorieTargetPercentage: null,
    targetProvenance: [],
  } as unknown as DailyNutritionSummarySource;

  it('answers a CKD question before explaining missing dialysis evidence', () => {
    const answer = builder.build({
      question: 'What foods are good for CKD?',
      intent: 'food-fit',
      mealContext: 'notRequired',
      summary: {
        ...baseSummary,
        deferredPolicies: [{
          policyId: 'ckd-non-dialysis-protein-v1',
          reason: 'missing-dialysis-status',
          explanation: 'Dialysis status is required.',
        }],
      },
    });

    expect(answer.startsWith('For someone with CKD')).toBe(true);
    expect(answer).toContain('\n\nFoods to eat:');
    expect(answer).toContain('Fresh fish or skinless chicken');
    expect(answer).toContain('Foods to limit:');
    expect(answer).toContain("I can already give general guidance, but");
    expect(answer).toContain("your dialysis status isn't recorded");
    expect(answer).not.toContain('Why does this matter?');
    expect(answer).not.toContain('Go to Health > Dialysis Status');
    expect(answer).not.toContain('Next step:');
    expect((answer.match(/dialysis status isn't recorded/g) ?? []).length).toBe(1);
  });

  it('answers a diabetes question before explaining a missing individualized target', () => {
    const answer = builder.build({
      question: 'What should I eat for diabetes?',
      intent: 'food-fit',
      mealContext: 'notRequired',
      summary: {
        ...baseSummary,
        deferredPolicies: [{
          policyId: 'diabetes-carbohydrate-target-v1',
          reason: 'missing-individualized-carbohydrate-target',
          explanation: 'An approved target is required.',
        }],
      },
    });

    expect(answer.startsWith('For diabetes')).toBe(true);
    expect(answer).toContain('personal carbohydrate goal');
    expect(answer).not.toContain('Health > Nutrition Targets');
  });

  it('explains why stale laboratory evidence limits personalization', () => {
    const answer = builder.build({
      question: 'Why are my kidney recommendations limited?',
      intent: 'food-fit',
      mealContext: 'notRequired',
      summary: {
        ...baseSummary,
        deferredPolicies: [{
          policyId: 'ckd-phosphorus-v1',
          reason: 'stale-egfr',
          explanation: 'A current eGFR is required.',
        }],
      },
    });

    expect(answer.startsWith('For someone with CKD')).toBe(true);
    expect(answer).toContain('eGFR results are missing, stale, or not usable');
    expect(answer).toContain('Why does this matter?');
    expect(answer).not.toContain('Health > Laboratory Results');
  });

  it('keeps general questions useful when no meal has been logged', () => {
    const answer = builder.build({
      question: 'How am I doing today?',
      intent: 'daily-improvement',
      mealContext: 'unavailable',
      summary: { ...baseSummary, mealCount: 0 },
    });

    expect(answer.startsWith("I can help you see how today's meals fit your goals.")).toBe(true);
    expect(answer).toContain('until a meal is logged');
  });

  it('uses known policy context even when the question is broad', () => {
    const answer = builder.build({
      question: 'What foods should I eat?',
      intent: 'recommendation',
      mealContext: 'notRequired',
      summary: {
        ...baseSummary,
        targetProvenance: [{
          target: 'proteinGrams',
          policyId: 'ckd-non-dialysis-protein-v1',
          source: 'KDOQI',
          version: 'v1',
          explanation: 'CKD policy',
          applicability: { context: 'CKD_NON_DIALYSIS', conditionCode: 'CKD', dialysisStatus: 'INACTIVE' },
        }],
      },
    });

    expect(answer.startsWith('For someone with CKD')).toBe(true);
  });

  it('answers a condition-specific question generally when the condition is not recorded', () => {
    const answer = builder.build({
      question: 'What should I eat for diabetes?',
      intent: 'food-fit',
      mealContext: 'notRequired',
      summary: baseSummary,
    });

    expect(answer.startsWith('For diabetes')).toBe(true);
    expect(answer).toContain("your diabetes status isn't recorded");
    expect(answer).not.toContain('Health > Health Conditions');
  });

  it('answers a nutrient education question before discussing personalization', () => {
    const answer = builder.build({
      question: 'Why is sodium important?',
      intent: 'daily-guidance',
      mealContext: 'notRequired',
      summary: baseSummary,
    });

    expect(answer.startsWith('Sodium is something your body needs')).toBe(true);
  });

  it('exposes reusable section metadata for future cards or chips', () => {
    const sections = builder.buildSections({
      question: 'What foods are good for CKD?',
      intent: 'food-fit',
      mealContext: 'notRequired',
      summary: {
        ...baseSummary,
        deferredPolicies: [{
          policyId: 'ckd-non-dialysis-protein-v1',
          reason: 'missing-dialysis-status',
          explanation: 'Dialysis status is required.',
        }],
      },
    });

    expect(sections.generalSections.map((section) => section.key)).toEqual([
      'foods-to-eat',
      'foods-to-limit',
    ]);
    expect(sections.limitationSections.map((section) => section.key)).toEqual(['personalization']);
  });

  it('shows a profile action when the user asks how to update it', () => {
    const answer = builder.build({
      question: 'How do I update my dialysis status?',
      intent: 'daily-guidance',
      mealContext: 'notRequired',
      summary: {
        ...baseSummary,
        deferredPolicies: [{
          policyId: 'ckd-non-dialysis-protein-v1',
          reason: 'missing-dialysis-status',
          explanation: 'Dialysis status is required.',
        }],
      },
    });

    expect(answer).toContain('Next step:');
    expect(answer).toContain('Health > Dialysis Status');
  });

  it('keeps a generic avoid question focused without unrelated profile notices', () => {
    const answer = builder.build({
      question: 'What foods should I avoid?',
      intent: 'avoidance-guidance',
      mealContext: 'notRequired',
      summary: {
        ...baseSummary,
        deferredPolicies: [{
          policyId: 'ckd-non-dialysis-protein-v1',
          reason: 'missing-dialysis-status',
          explanation: 'Dialysis status is required.',
        }],
      },
    });

    expect(answer).toContain('Foods to limit:');
    expect(answer).not.toContain('dialysis');
    expect(answer).not.toContain('Health >');
  });
});
