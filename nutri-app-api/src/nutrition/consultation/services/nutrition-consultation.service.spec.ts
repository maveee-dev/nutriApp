import { jest } from '@jest/globals';
import { NutritionConsultationService } from './nutrition-consultation.service.js';
import { FoodEntityResolver } from './food-entity-resolver.js';

describe('NutritionConsultationService', () => {
  const foodEntityResolver = { resolve: jest.fn() } as unknown as FoodEntityResolver;
  const summary = {
    date: '2026-08-19',
    mealCount: 1,
    totals: [],
    targets: { sodiumMilligrams: '1500', proteinGrams: '60' },
    insights: [],
    deferredPolicies: [],
    caloriesConsumedKcal: '500',
    remainingCaloriesKcal: '1500',
    calorieTargetPercentage: 25,
    targetProvenance: [{
      target: 'proteinGrams',
      policyId: 'ckd-non-dialysis-protein-v1',
      source: 'KDOQI',
      version: 'ckd-non-dialysis-protein-v1',
      explanation: 'Protein target uses the latest approved eGFR evidence.',
      applicability: { context: 'CKD_NON_DIALYSIS', conditionCode: 'CKD', dialysisStatus: 'INACTIVE', laboratory: { testCode: 'egfr', value: '42', unit: 'mL/min/1.73m2', collectedAt: '2026-08-18T00:00:00.000Z' } },
    }],
  };

  it('returns a deterministic, provenance-bearing consultation response', async () => {
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([{ id: 'lab-1', testCode: 'egfr', value: '42', unit: 'mL/min/1.73m2', collectedAt: new Date('2026-08-18T00:00:00.000Z') }]) } as never,
      undefined,
      foodEntityResolver,
    );

    const result = await service.consult('user-1', 'Which of my lab results affected this?', '2026-08-19');

    expect(result.assistantMode).toBe('deterministic-evidence');
    expect(result.mealContext).toBe('notRequired');
    expect(result.intent).toBe('laboratory-evidence');
    expect(result.laboratoryEvidence[0]).toMatchObject({ id: 'lab-1', status: 'current', source: 'manual-entry' });
    expect(result.laboratoryEvidence[0].usedByPolicies[0].policyId).toBe('ckd-non-dialysis-protein-v1');
    expect(result.limitations).toHaveLength(1);
  });

  it('explains missing meal context without inventing guidance', async () => {
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue({ ...summary, mealCount: 0 }) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      foodEntityResolver,
    );

    const result = await service.consult('user-1', 'How am I doing today?', '2026-08-19');
    expect(result.answer).toContain('until a meal is logged');
    expect(result.mealContext).toBe('unavailable');
    expect(result.laboratoryEvidence).toEqual([]);
  });

  it.each([
    'Why is sodium important?',
    'Can I eat bananas?',
    'Which lab result affected my guidance?',
    'What should I eat today?',
  ])('does not require meal context for %s', async (question) => {
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue({ ...summary, mealCount: 0 }) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      foodEntityResolver,
    );

    const result = await service.consult('user-1', question, '2026-08-19');

    expect(result.mealContext).toBe('notRequired');
    expect(result.answer).not.toContain('have not logged a meal today');
  });

  it('marks daily progress context available when meals exist', async () => {
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      foodEntityResolver,
    );

    const result = await service.consult('user-1', 'How am I doing today?', '2026-08-19');

    expect(result.mealContext).toBe('available');
  });

  it('routes broad food requests through deterministic recommendations', async () => {
    const recommendationService = { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue({ ...summary, mealCount: 0 }) } as never,
      recommendationService as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      foodEntityResolver,
    );

    const result = await service.consult('user-1', 'Healthy foods', '2026-08-19');

    expect(result.intent).toBe('recommendation');
    expect(result.mealContext).toBe('notRequired');
    expect(recommendationService.recommendDaily).toHaveBeenCalled();
    expect(result.foodResolution).toBeUndefined();
    expect(result.answer).not.toContain('nutrition assistant');
  });

  it('answers broad food questions before explaining deferred recommendations', async () => {
    const recommendationService = {
      recommendDaily: jest.fn().mockReturnValue({
        selected: [{
          id: 'deferred-policy-ckd-non-dialysis-protein-v1',
          category: 'deferred-policy',
          disposition: 'informational',
          severity: 'low',
          scope: 'daily',
          title: 'Specific nutrition guidance is deferred',
          message: 'More specific nutrition guidance is deferred: Dialysis status is required.',
          evidence: [],
          policy: { policyId: 'deferred-policy-recommendation', version: 'v1' },
        }],
        suppressed: [],
      }),
    };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue({
        ...summary,
        deferredPolicies: [{
          policyId: 'ckd-non-dialysis-protein-v1',
          reason: 'missing-dialysis-status',
          explanation: 'Dialysis status is required.',
        }],
      }) } as never,
      recommendationService as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      foodEntityResolver,
    );

    const result = await service.consult('user-1', 'What foods can I eat', '2026-08-19');

    expect(result.answer.startsWith('For someone with CKD')).toBe(true);
    expect(result.answer).not.toContain("Based on today's approved nutrition guidance");
    expect(result.answer).not.toContain('More specific nutrition guidance is deferred');
    expect(result.answer).toContain("your dialysis status isn't recorded");
    expect(result.answer).not.toContain('Go to Health > Dialysis Status');
    expect(result.answer).toContain('\n\n');
  });

  it('exposes deterministic food ambiguity without inventing an evaluation', async () => {
    const resolver = {
      resolve: jest.fn().mockResolvedValue({
        status: 'ambiguous',
        query: 'Can I eat egg?',
        candidates: [
          { kind: 'food', foodId: 'egg-1', displayName: 'Egg', variantLabel: null, matchType: 'display-exact', confidence: 'high' },
          { kind: 'food', foodId: 'egg-2', displayName: 'Egg', variantLabel: 'Duck', matchType: 'display-exact', confidence: 'high' },
        ],
      }),
    };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
    );

    const result = await service.consult('user-1', 'Can I eat egg?', '2026-08-19');

    expect(result.foodResolution?.status).toBe('ambiguous');
    expect(result.answer).toContain('several possible foods');
  });

  it('returns structured pending clarification state with stable candidate IDs', async () => {
    const resolver = {
      resolve: jest.fn().mockResolvedValue({
        status: 'ambiguous',
        query: 'Can I eat bananas?',
        candidates: [
          { kind: 'food', stableId: 'banana-plain', foodId: 'banana-plain', displayName: 'Banana', variantLabel: 'Raw', matchType: 'display-exact', confidence: 'high' },
          { kind: 'food', stableId: 'banana-ripe', foodId: 'banana-ripe', displayName: 'Ripe Banana', variantLabel: null, matchType: 'display-exact', confidence: 'high' },
        ],
      }),
    };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
    );

    const result = await service.consult('user-1', 'Can I eat bananas?', '2026-08-19');

    expect(result.pendingClarification).toMatchObject({
      type: 'food',
      originalQuestion: 'Can I eat bananas?',
      choices: [
        expect.objectContaining({ stableId: 'banana-plain', foodId: 'banana-plain', displayName: 'Banana' }),
        expect.objectContaining({ stableId: 'banana-ripe', foodId: 'banana-ripe', displayName: 'Ripe Banana' }),
      ],
    });
  });

  it('revalidates a selected clarification candidate and evaluates the original question', async () => {
    const selectedCandidate = {
      kind: 'food' as const,
      stableId: 'banana-ripe',
      foodId: 'banana-ripe',
      displayName: 'Ripe Banana',
      variantLabel: null,
      matchType: 'display-exact' as const,
      confidence: 'high' as const,
    };
    const resolver = { resolve: jest.fn().mockResolvedValue({
      status: 'ambiguous' as const,
      query: 'Can I eat bananas?',
      candidates: [
        { ...selectedCandidate, variantLabel: null },
        { kind: 'food' as const, stableId: 'banana-overripe', foodId: 'banana-overripe', displayName: 'Overripe Banana', variantLabel: null, matchType: 'display-exact' as const, confidence: 'high' as const },
      ],
    }) };
    const foodEvaluation = {
      evaluate: jest.fn().mockResolvedValue({
        foodId: 'banana-ripe',
        displayName: 'Ripe Banana',
        variantLabel: null,
        serving: { id: 'serving-1', name: '1 banana', grams: '115', quantity: '1' },
        evaluation: { score: 82, evaluationStatus: 'evaluated', coverage: 100, reasons: [], contributions: [], deferredPolicies: [] },
        targetCalculation: { targets: summary.targets, adjustments: [], deferredPolicies: [], targetProvenance: summary.targetProvenance },
        policySetFingerprint: 'policy-set-1',
      }),
    };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
      foodEvaluation as never,
    );

    const result = await service.consult('user-1', '1', '2026-08-19', {
      type: 'food',
      originalQuestion: 'Can I eat bananas?',
      selectedStableId: 'banana-ripe',
    });

    expect(resolver.resolve).toHaveBeenCalledWith('user-1', 'Can I eat bananas?');
    expect(foodEvaluation.evaluate).toHaveBeenCalledWith('user-1', expect.objectContaining({
      status: 'resolved',
      query: 'Can I eat bananas?',
      candidates: [expect.objectContaining({ stableId: 'banana-ripe', foodId: 'banana-ripe' })],
    }));
    expect(result.question).toBe('Can I eat bananas?');
    expect(result.pendingClarification).toBeUndefined();
    expect(result.foodEvaluation).toMatchObject({ foodId: 'banana-ripe' });
    expect(result.answer).toContain('Ripe Banana');
  });

  it('keeps the clarification active when a selected candidate is invalid', async () => {
    const resolver = { resolve: jest.fn().mockResolvedValue({
      status: 'ambiguous' as const,
      query: 'Can I eat bananas?',
      candidates: [{ kind: 'food' as const, stableId: 'banana-1', foodId: 'banana-1', displayName: 'Banana', variantLabel: null, matchType: 'display-exact' as const, confidence: 'high' as const }],
    }) };
    const foodEvaluation = { evaluate: jest.fn() };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
      foodEvaluation as never,
    );

    const result = await service.consult('user-1', '1', '2026-08-19', {
      type: 'food',
      originalQuestion: 'Can I eat bananas?',
      selectedStableId: 'stale-food-id',
    });

    expect(foodEvaluation.evaluate).not.toHaveBeenCalled();
    expect(result.pendingClarification?.choices[0]?.stableId).toBe('banana-1');
    expect(result.answer).toContain('not one of the available options');
  });

  it('does not evaluate a stale selection when the original food is no longer ambiguous', async () => {
    const resolver = { resolve: jest.fn().mockResolvedValue({ status: 'not-found' as const, query: 'Can I eat bananas?', candidates: [] }) };
    const foodEvaluation = { evaluate: jest.fn() };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
      foodEvaluation as never,
    );

    const result = await service.consult('user-1', '1', '2026-08-19', {
      type: 'food',
      originalQuestion: 'Can I eat bananas?',
      selectedStableId: 'banana-1',
    });

    expect(foodEvaluation.evaluate).not.toHaveBeenCalled();
    expect(result.pendingClarification).toBeUndefined();
    expect(result.answer).toContain('no longer available');
  });

  it('exposes deterministic food evaluation for a confident food match', async () => {
    const resolver = {
      resolve: jest.fn().mockResolvedValue({
        status: 'resolved',
        query: 'Can I eat egg?',
        candidates: [{ kind: 'food', foodId: 'egg-1', displayName: 'Egg', variantLabel: 'Large', matchType: 'display-exact', confidence: 'high' }],
      }),
    };
    const foodEvaluation = {
      evaluate: jest.fn().mockResolvedValue({
        foodId: 'egg-1',
        displayName: 'Egg',
        variantLabel: 'Large',
        serving: { id: 'serving-1', name: '1 large egg', grams: '50', quantity: '1' },
        evaluation: { score: 100, evaluationStatus: 'evaluated', coverage: 100, reasons: [], contributions: [], deferredPolicies: [] },
        targetCalculation: { targets: summary.targets, adjustments: [], deferredPolicies: [], targetProvenance: summary.targetProvenance },
        policySetFingerprint: 'policy-set-1',
      }),
    };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
      foodEvaluation as never,
    );

    const result = await service.consult('user-1', 'Can I eat egg?', '2026-08-19');

    expect(foodEvaluation.evaluate).toHaveBeenCalledWith('user-1', expect.objectContaining({ status: 'resolved' }));
    expect(result.foodEvaluation).toMatchObject({
      foodId: 'egg-1',
      serving: { name: '1 large egg', grams: '50' },
      evaluation: { score: 100, coverage: 100 },
      policySetFingerprint: 'policy-set-1',
    });
    expect(result.answer).toContain('compatibility score is 100/100');
  });

  it('keeps an inactive potassium policy out of the score while disclosing the limitation', async () => {
    const resolver = {
      resolve: jest.fn().mockResolvedValue({
        status: 'resolved',
        query: 'Can I eat bananas?',
        candidates: [{ kind: 'food', foodId: 'banana-1', displayName: 'Bananas', variantLabel: 'Ripe', matchType: 'display-exact', confidence: 'high' }],
      }),
    };
    const foodEvaluation = {
      evaluate: jest.fn().mockResolvedValue({
        foodId: 'banana-1',
        displayName: 'Ripe Banana',
        variantLabel: null,
        serving: { id: 'serving-1', name: '1 banana', grams: '115', quantity: '1' },
        evaluation: {
          score: 100,
          evaluationStatus: 'evaluated',
          coverage: 100,
          reasons: [],
          contributions: [{ nutrient: 'potassium', unit: 'mg', amount: '422', targetValue: null, currentDailyValue: null, explanation: 'Potassium contribution.' }],
          deferredPolicies: [
            {
              policyId: 'ckd-potassium-v1',
              reason: 'missing-individualized-potassium-target',
              explanation: 'Potassium was not included in this compatibility score because no individualized potassium limit is currently available. If your healthcare team has given you a potassium restriction, use this score together with that guidance.',
            },
            {
              policyId: 'ckd-phosphorus-v1',
              reason: 'missing-individualized-phosphorus-target',
              explanation: 'An approved individualized phosphorus limit is required before CKD-specific phosphorus guidance can be applied.',
            },
          ],
        },
        targetCalculation: { targets: summary.targets, adjustments: [], deferredPolicies: [], targetProvenance: summary.targetProvenance },
        policySetFingerprint: 'policy-set-1',
      }),
    };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
      foodEvaluation as never,
    );

    const result = await service.consult('user-1', 'Can I eat bananas?', '2026-08-19');

    expect(result.answer.startsWith('I could only check part of the nutrition guidance')).toBe(true);
    expect(result.answer).toContain('This serving contains 422 mg of potassium.');
    expect(result.answer).toContain('Because a personalized potassium target has not been configured');
    expect(result.answer).toContain('Phosphorus could not be included because a personalized phosphorus target has not been configured.');
    expect(result.answer.indexOf('Because a personalized potassium target')).toBeLessThan(result.answer.indexOf('numeric compatibility score'));
    expect(result.answer).toContain('The numeric compatibility score for the guidance checked is 100/100.');
    expect(result.answer).not.toContain('current daily limit');
  });

  it('uses structured nutrition insights as the food consultation context', async () => {
    const resolver = {
      resolve: jest.fn().mockResolvedValue({
        status: 'resolved',
        query: 'Can I eat bananas?',
        candidates: [{ kind: 'food', foodId: 'banana-1', displayName: 'Bananas', variantLabel: null, matchType: 'display-exact', confidence: 'high' }],
      }),
    };
    const foodEvaluation = {
      evaluate: jest.fn().mockResolvedValue({
        foodId: 'banana-1',
        displayName: 'Ripe Banana',
        variantLabel: null,
        serving: { id: 'serving-1', name: '1 banana', grams: '115', quantity: '1' },
        evaluation: {
          score: 100,
          evaluationStatus: 'evaluated',
          coverage: 53.33,
          reasons: [],
          contributions: [],
          deferredPolicies: [{ policyId: 'ckd-potassium-v1', reason: 'missing-individualized-potassium-target', explanation: 'Legacy policy text.' }],
          nutritionInsights: [{
            category: 'potassium',
            severity: 'information',
            title: 'Potassium information',
            message: 'This serving contains approximately 375 mg of potassium. Because no personalized potassium target is configured, NutriApp cannot determine whether this amount fits your individual daily allowance.',
            evidence: { nutrient: 'potassium', amount: '375', unit: 'mg' },
          }],
        },
        targetCalculation: { targets: summary.targets, adjustments: [], deferredPolicies: [], targetProvenance: summary.targetProvenance },
        policySetFingerprint: 'policy-set-1',
      }),
    };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
      foodEvaluation as never,
    );

    const result = await service.consult('user-1', 'Can I eat bananas?', '2026-08-19');

    expect(result.answer).toContain('This serving contains approximately 375 mg of potassium.');
    expect(result.answer).not.toContain('Legacy policy text.');
  });

  it('presents a partial high score as incomplete before showing the numeric score', async () => {
    const resolver = {
      resolve: jest.fn().mockResolvedValue({
        status: 'resolved',
        query: 'Can I eat bananas?',
        candidates: [{ kind: 'food', foodId: 'banana-1', displayName: 'Bananas', variantLabel: null, matchType: 'display-exact', confidence: 'high' }],
      }),
    };
    const foodEvaluation = {
      evaluate: jest.fn().mockResolvedValue({
        foodId: 'banana-1',
        displayName: 'Ripe Banana',
        variantLabel: null,
        serving: { id: 'serving-1', name: '1 banana', grams: '115', quantity: '1' },
        evaluation: {
          score: 100,
          evaluationStatus: 'evaluated',
          coverage: 53.33,
          reasons: [],
          contributions: [],
          deferredPolicies: [{
            policyId: 'ckd-phosphorus-v1',
            reason: 'missing-individualized-phosphorus-target',
            explanation: 'Phosphorus was not included in the compatibility score because no individualized phosphorus target is currently configured.',
          }],
        },
        targetCalculation: { targets: summary.targets, adjustments: [], deferredPolicies: [], targetProvenance: summary.targetProvenance },
        policySetFingerprint: 'policy-set-1',
      }),
    };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
      foodEvaluation as never,
    );

    const result = await service.consult('user-1', 'Can I eat bananas?', '2026-08-19');

    expect(result.answer.startsWith('I could only check part of the nutrition guidance')).toBe(true);
    expect(result.answer.indexOf('Phosphorus was not included')).toBeLessThan(result.answer.indexOf('appears compatible'));
    expect(result.answer.indexOf('appears compatible')).toBeLessThan(result.answer.indexOf('numeric compatibility score'));
    expect(result.answer).toContain('The numeric compatibility score for the guidance checked is 100/100.');
    expect(result.answer).not.toContain('53.33%');
  });

  it.each([
    {
      question: 'Can I eat bananas?',
      displayName: 'Bananas',
      score: 82,
      recommendationMessage: 'Choose portions that fit your current kidney guidance.',
      evidence: { context: 'CKD', dialysisStatus: 'INACTIVE', potassium: 'current' },
    },
    {
      question: 'Can I eat chicken?',
      displayName: 'Chicken Breast',
      score: 91,
      recommendationMessage: 'Spread protein choices across the day as advised for dialysis.',
      evidence: { context: 'CKD', dialysisStatus: 'HEMODIALYSIS', potassium: 'current', phosphorus: 'current' },
    },
  ])('answers the food first when $question has selected recommendations', async ({ question, displayName, score, recommendationMessage, evidence }) => {
    const resolver = {
      resolve: jest.fn().mockResolvedValue({
        status: 'resolved',
        query: question,
        candidates: [{ kind: 'food', foodId: 'food-1', displayName, variantLabel: null, matchType: 'display-exact', confidence: 'high' }],
      }),
    };
    const foodEvaluation = {
      evaluate: jest.fn().mockResolvedValue({
        foodId: 'food-1',
        displayName,
        variantLabel: null,
        serving: { id: 'serving-1', name: '1 serving', grams: '100', quantity: '1' },
        evaluation: { score, evaluationStatus: 'evaluated', coverage: 100, reasons: [], contributions: [], deferredPolicies: [] },
        targetCalculation: { targets: summary.targets, adjustments: [], deferredPolicies: [], targetProvenance: [evidence] },
        policySetFingerprint: 'policy-set-1',
      }),
    };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({
        selected: [{
          category: 'nutrient',
          message: recommendationMessage,
          evidence: [],
          policy: { policyId: 'test-policy', version: 'v1' },
        }],
        suppressed: [],
      }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
      foodEvaluation as never,
    );

    const result = await service.consult('user-1', question, '2026-08-19');

    expect(result.answer).toContain(`This serving of ${displayName}`);
    expect(result.answer.indexOf(`This serving of ${displayName}`)).toBeLessThan(result.answer.indexOf(recommendationMessage));
    expect(result.answer.indexOf('compatibility score')).toBeLessThan(result.answer.indexOf(recommendationMessage));
    expect(result.foodEvaluation?.targetCalculation.targetProvenance).toEqual([evidence]);
  });

  it('answers an ambiguous food request before supplemental recommendations', async () => {
    const resolver = {
      resolve: jest.fn().mockResolvedValue({
        status: 'ambiguous',
        query: 'Can I eat adobo?',
        candidates: [
          { kind: 'food', foodId: 'chicken-adobo', displayName: 'Chicken Adobo', variantLabel: null, matchType: 'display-exact', confidence: 'high' },
          { kind: 'food', foodId: 'pork-adobo', displayName: 'Pork Adobo', variantLabel: null, matchType: 'display-exact', confidence: 'high' },
        ],
      }),
    };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [{
        category: 'nutrient',
        message: 'Keep meals lower in sodium.',
        evidence: [],
        policy: { policyId: 'test-policy', version: 'v1' },
      }], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
    );

    const result = await service.consult('user-1', 'Can I eat adobo?', '2026-08-19');

    expect(result.answer.startsWith('I found several possible foods')).toBe(true);
    expect(result.answer).toContain('Chicken Adobo');
    expect(result.answer).toContain('Keep meals lower in sodium.');
  });

  it('answers an unknown food request before supplemental recommendations', async () => {
    const resolver = { resolve: jest.fn().mockResolvedValue({ status: 'not-found', query: 'Can I eat dragon fruit pizza?', candidates: [] }) };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [{
        category: 'nutrient',
        message: 'Choose fresh foods when possible.',
        evidence: [],
        policy: { policyId: 'test-policy', version: 'v1' },
      }], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
    );

    const result = await service.consult('user-1', 'Can I eat dragon fruit pizza?', '2026-08-19');

    expect(result.answer.startsWith('I could not find a confident match')).toBe(true);
    expect(result.answer).toContain('Choose fresh foods when possible.');
  });

  it('keeps an approved recipe consultation deterministic when recipe evaluation is unavailable', async () => {
    const resolver = {
      resolve: jest.fn().mockResolvedValue({
        status: 'resolved',
        query: 'Can I eat adobo?',
        candidates: [{ kind: 'approved-recipe', recipeId: 'recipe-1', recipeVersionId: 'version-1', displayName: 'Chicken Adobo', variantLabel: null, matchType: 'recipe-exact', confidence: 'high' }],
      }),
    };
    const foodEvaluation = { evaluate: jest.fn().mockResolvedValue(undefined) };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
      foodEvaluation as never,
    );

    const result = await service.consult('user-1', 'Can I eat adobo?', '2026-08-19');

    expect(foodEvaluation.evaluate).toHaveBeenCalledWith('user-1', expect.objectContaining({ status: 'resolved' }));
    expect(result.foodEvaluation).toBeUndefined();
    expect(result.answer).toContain('could not be evaluated right now');
  });

  it('does not silently choose between duplicate personal recipes', async () => {
    const resolver = {
      resolve: jest.fn().mockResolvedValue({
        status: 'ambiguous',
        query: 'Can I eat my Chicken Adobo?',
        candidates: [
          { kind: 'approved-recipe', stableId: 'version-1', recipeId: 'recipe-1', recipeVersionId: 'version-1', displayName: 'Chicken Adobo', recipeYieldServings: '4', recipeIngredientNames: ['Chicken Breast', 'Soy Sauce'], matchType: 'recipe-exact', confidence: 'high' },
          { kind: 'approved-recipe', stableId: 'version-2', recipeId: 'recipe-2', recipeVersionId: 'version-2', displayName: 'Chicken Adobo', recipeYieldServings: '6', recipeIngredientNames: ['Chicken Thigh', 'Coconut Milk'], matchType: 'recipe-exact', confidence: 'high' },
        ],
      }),
    };
    const recipeEvaluationService = { evaluate: jest.fn() };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
      undefined,
      undefined,
      recipeEvaluationService as never,
    );

    const result = await service.consult('user-1', 'Can I eat my Chicken Adobo?', '2026-08-19');

    expect(result.pendingClarification?.choices).toHaveLength(2);
    expect(result.answer).toContain('Chicken Adobo');
    expect(result.answer).toContain('4 servings');
    expect(result.answer).toContain('6 servings');
    expect(recipeEvaluationService.evaluate).not.toHaveBeenCalled();
  });

  it('evaluates the exact immutable recipe version selected by consultation', async () => {
    const resolver = {
      resolve: jest.fn().mockResolvedValue({
        status: 'resolved',
        query: 'Can I eat my Chicken Adobo?',
        candidates: [{ kind: 'approved-recipe', stableId: 'version-1', recipeId: 'recipe-1', recipeVersionId: 'version-1', displayName: 'Chicken Adobo', matchType: 'recipe-exact', confidence: 'high' }],
      }),
    };
    const recipeEvaluationService = {
      evaluate: jest.fn().mockResolvedValue({
        recipeId: 'recipe-1', recipeVersionId: 'version-1', recipeVersion: 1, portionGrams: '100',
        evaluation: { score: 84, coverage: 100, reasons: [], contributions: [], deferredPolicies: [] },
      }),
    };
    const service = new NutritionConsultationService(
      { getDailySummary: jest.fn().mockResolvedValue(summary) } as never,
      { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      resolver as never,
      undefined,
      undefined,
      recipeEvaluationService as never,
    );

    const result = await service.consult('user-1', 'Can I eat my Chicken Adobo?', '2026-08-19');

    expect(recipeEvaluationService.evaluate).toHaveBeenCalledWith('user-1', 'recipe-1', undefined, '1', 'version-1');
    expect(result.recipeEvaluation?.evaluation.score).toBe(84);
    expect(result.answer).toContain('your Chicken Adobo');
  });

  it('uses historical replay projections for a past consultation date when available', async () => {
    const historicalSummary = { ...summary, date: '2026-08-19', evaluationMode: 'historical-replay' as const, snapshotIds: ['snapshot-historical'], policySetFingerprints: ['policy-set-historical'] };
    const historical = { getHistoricalSummary: jest.fn().mockResolvedValue({ startDate: '2026-08-19', endDate: '2026-08-25', days: [historicalSummary] }), getDailySummary: jest.fn() };
    const recommendationService = { recommendHistorical: jest.fn().mockReturnValue({ selected: [], suppressed: [], evaluation: { evaluationMode: 'historical-replay', deferredPolicies: [], snapshotIds: ['snapshot-historical'], evaluatorVersions: ['food-evaluation-v3'], policySetFingerprints: ['policy-set-historical'], snapshotFingerprints: [], replayLimitations: ['missing-replay-fingerprint'] } }), recommendDaily: jest.fn() };
    const service = new NutritionConsultationService(
      historical as never,
      recommendationService as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      undefined,
      foodEntityResolver,
    );

    const result = await service.consult('user-1', 'Why is this recommended?', '2026-08-19');

    expect(historical.getHistoricalSummary).toHaveBeenCalledWith('user-1', '2026-08-19');
    expect(historical.getDailySummary).not.toHaveBeenCalled();
    expect(recommendationService.recommendHistorical).toHaveBeenCalledWith('user-1', [historicalSummary]);
    expect(result.recommendations.evaluation).toMatchObject({ evaluationMode: 'historical-replay', snapshotIds: ['snapshot-historical'] });
    expect(result.answer).toContain('Some historical details could not be shown because stored information was incomplete or incompatible.');
    expect(result.limitations).toContain('Some historical details could not be shown because stored information was incomplete or incompatible.');
  });
});
