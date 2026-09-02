import { LaboratoryAnalysisService } from './laboratory-analysis.service.js';
import { LaboratoryReportSource } from '../sources/laboratory-report.source.js';

const report = (date: string, results = [result()]): LaboratoryReportSource => ({
  id: `report-${date}`,
  userId: 'user-1',
  reportDate: new Date(`${date}T00:00:00.000Z`),
  source: 'manual',
  createdAt: new Date(`${date}T01:00:00.000Z`),
  results,
});

const result = (overrides: Partial<NonNullable<LaboratoryReportSource['results'][number]>> = {}) => ({
  id: `result-${overrides.id ?? '1'}`,
  reportId: 'report-1',
  userId: 'user-1',
  testCode: 'potassium',
  testName: null,
  value: '5.8',
  unit: 'mmol/L',
  referenceLow: '3.5',
  referenceHigh: '5.1',
  flag: null,
  collectedAt: new Date('2026-08-20T00:00:00.000Z'),
  createdAt: new Date('2026-08-20T01:00:00.000Z'),
  updatedAt: new Date('2026-08-20T01:00:00.000Z'),
  ...overrides,
});

describe('LaboratoryAnalysisService', () => {
  const service = new LaboratoryAnalysisService();

  it('classifies a result using only the supplied reference range', () => {
    const analyzed = service.analyzeReport(report('2026-08-20'));

    expect(analyzed.results[0]).toMatchObject({
      testCode: 'potassium',
      testName: 'Potassium',
      status: 'high',
      message: 'Your Potassium result is above the laboratory reference range.',
    });
    expect(analyzed.nutritionInsights[0]).toMatchObject({
      category: 'potassium',
      severity: 'information',
      evidence: { value: '5.8', unit: 'mmol/L', status: 'high' },
    });
  });

  it('returns unknown status without a reference range and does not infer a dietary limit', () => {
    const analyzed = service.analyzeReport(report('2026-08-20', [result({ referenceLow: null, referenceHigh: null })]));

    expect(analyzed.results[0]).toMatchObject({ status: 'unknown' });
    expect(analyzed.nutritionInsights[0]?.message).toContain('do not create dietary limits');
  });

  it('ignores unsupported report results without failing analysis', () => {
    const analyzed = service.analyzeReport(report('2026-08-20', [result({ testCode: 'unsupported-test' })]), ['unsupported-test']);

    expect(analyzed.results).toEqual([]);
    expect(analyzed.ignoredTestCodes).toEqual(['unsupported-test']);
  });

  it('reports improving only when an abnormal result moves into the supplied range', () => {
    const previous = report('2026-06-01', [result({ id: 'previous', value: '5.8' })]);
    const latest = report('2026-07-01', [result({ id: 'latest', value: '4.8' })]);

    expect(service.trends([latest, previous])).toMatchObject([{
      testCode: 'potassium',
      direction: 'improving',
      previous: { value: '5.8', status: 'high' },
      latest: { value: '4.8', status: 'normal' },
    }]);
  });

  it('returns insufficient history for a single recorded result', () => {
    expect(service.trends([report('2026-07-01')])[0]).toMatchObject({ direction: 'insufficient-history', previous: null });
  });
});
