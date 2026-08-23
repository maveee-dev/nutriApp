import { jest } from '@jest/globals';
import { NutritionConsultationService } from './nutrition-consultation.service.js';

describe('NutritionConsultationService', () => {
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
    );

    const result = await service.consult('user-1', 'Which of my lab results affected this?', '2026-08-19');

    expect(result.assistantMode).toBe('deterministic-evidence');
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
    );

    const result = await service.consult('user-1', 'What should I eat today?', '2026-08-19');
    expect(result.answer).toContain('have not logged a meal today');
    expect(result.laboratoryEvidence).toEqual([]);
  });

  it('uses historical replay projections for a past consultation date when available', async () => {
    const historicalSummary = { ...summary, date: '2026-08-19', evaluationMode: 'historical-replay' as const, snapshotIds: ['snapshot-historical'], policySetFingerprints: ['policy-set-historical'] };
    const historical = { getHistoricalSummary: jest.fn().mockResolvedValue({ startDate: '2026-08-19', endDate: '2026-08-25', days: [historicalSummary] }), getDailySummary: jest.fn() };
    const recommendationService = { recommendHistorical: jest.fn().mockReturnValue({ selected: [], suppressed: [], evaluation: { evaluationMode: 'historical-replay', deferredPolicies: [], snapshotIds: ['snapshot-historical'], evaluatorVersions: ['food-evaluation-v3'], policySetFingerprints: ['policy-set-historical'], snapshotFingerprints: [], replayLimitations: ['missing-replay-fingerprint'] } }), recommendDaily: jest.fn() };
    const service = new NutritionConsultationService(
      historical as never,
      recommendationService as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
    );

    const result = await service.consult('user-1', 'Why is this recommended?', '2026-08-19');

    expect(historical.getHistoricalSummary).toHaveBeenCalledWith('user-1', '2026-08-19');
    expect(historical.getDailySummary).not.toHaveBeenCalled();
    expect(recommendationService.recommendHistorical).toHaveBeenCalledWith('user-1', [historicalSummary]);
    expect(result.recommendations.evaluation).toMatchObject({ evaluationMode: 'historical-replay', snapshotIds: ['snapshot-historical'] });
    expect(result.answer).toContain('historical evaluation details cannot be replayed completely');
    expect(result.limitations).toContain('Some historical evaluation details could not be replayed because the required stored evaluation context was incomplete or incompatible.');
  });
});
