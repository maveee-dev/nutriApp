import { jest } from '@jest/globals';
import { LaboratoryConsultationProjector } from './laboratory-consultation.projector.js';
import { LaboratoryReportService } from './laboratory-report.service.js';

describe('LaboratoryConsultationProjector', () => {
  it('projects latest laboratory insights without exposing storage concerns', async () => {
    const insights = [{
      category: 'potassium', severity: 'information' as const, title: 'Potassium review', message: 'Review with your provider.',
      evidence: { testCode: 'potassium', value: '5.8', unit: 'mmol/L', status: 'high' as const },
    }];
    const reportService = { latest: jest.fn().mockResolvedValue({ results: [], nutritionInsights: insights }) } as unknown as LaboratoryReportService;
    const projector = new LaboratoryConsultationProjector(reportService);

    await expect(projector.project('user-1')).resolves.toEqual(insights);
    expect(reportService.latest).toHaveBeenCalledWith('user-1');
  });

  it('keeps consultation available when the optional laboratory projection fails', async () => {
    const reportService = { latest: jest.fn().mockRejectedValue(new Error('unavailable')) } as unknown as LaboratoryReportService;
    await expect(new LaboratoryConsultationProjector(reportService).project('user-1')).resolves.toEqual([]);
  });
});
