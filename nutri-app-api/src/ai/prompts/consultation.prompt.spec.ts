import { buildConsultationPrompt } from './consultation.prompt.js';

describe('buildConsultationPrompt', () => {
  it('serializes only the structured consultation context with safety instructions', () => {
    const prompt = buildConsultationPrompt({
      userConditions: ['CKD'],
      labSummary: [{
        testCode: 'egfr',
        value: '42',
        unit: 'mL/min/1.73m2',
        collectedAt: '2026-08-20T00:00:00.000Z',
        status: 'current',
        usedByPolicies: ['ckd-non-dialysis-protein-v1'],
      }],
      foodEvaluation: null,
      dailySummary: {
        date: '2026-08-20',
        evaluationStatus: 'evaluated',
        deferredPolicies: [],
        adherence: [],
        replayLimitations: [],
      },
      recommendations: [],
      userQuestion: 'Why is this recommendation shown?',
      conversation: [],
    });

    expect(prompt).toContain('Never calculate, estimate, round, infer, or invent');
    expect(prompt).toContain('"testCode": "egfr"');
    expect(prompt).toContain('"value": "42"');
    expect(prompt).toContain('Why is this recommendation shown?');
    expect(prompt).toContain('This is educational nutrition information');
  });
});
