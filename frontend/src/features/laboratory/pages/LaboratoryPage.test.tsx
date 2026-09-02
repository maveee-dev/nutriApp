import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LaboratoryPage } from './LaboratoryPage';

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('../hooks/useLaboratory', () => ({
  useLaboratoryReports: () => ({ isLoading: false, isError: false, data: [{ id: 'report-1', reportDate: '2026-08-30', source: 'manual', createdAt: '2026-08-30T00:00:00.000Z', ignoredTestCodes: [], nutritionInsights: [], results: [{ id: 'result-1', reportId: 'report-1', testCode: 'potassium', testName: 'Potassium', value: '5.8', unit: 'mmol/L', referenceLow: '3.5', referenceHigh: '5.1', flag: null, status: 'high', message: 'Your Potassium result is above the laboratory reference range.', reportDate: '2026-08-30' }] }] }),
  useLaboratoryLatest: () => ({ isLoading: false, isError: false, data: { results: [{ id: 'result-1', reportId: 'report-1', testCode: 'potassium', testName: 'Potassium', value: '5.8', unit: 'mmol/L', referenceLow: '3.5', referenceHigh: '5.1', flag: null, status: 'high', message: 'Your Potassium result is above the laboratory reference range.', reportDate: '2026-08-30' }], nutritionInsights: [{ category: 'potassium', severity: 'information', title: 'Potassium review', message: 'Review this result with your healthcare provider.', evidence: { testCode: 'potassium', value: '5.8', unit: 'mmol/L', status: 'high' } }] } }),
  useLaboratoryTrends: () => ({ isLoading: false, data: [{ testCode: 'potassium', testName: 'Potassium', direction: 'insufficient-history', latest: { resultId: 'result-1', reportDate: '2026-08-30', value: '5.8', unit: 'mmol/L', status: 'high' }, previous: null, points: [{ resultId: 'result-1', reportDate: '2026-08-30', value: '5.8', unit: 'mmol/L', status: 'high' }] }] }),
  useCreateLaboratoryReportMutation: () => ({ mutate: mocks.mutate, isPending: false }),
}));

afterEach(() => {
  cleanup();
  mocks.mutate.mockReset();
});

describe('LaboratoryPage', () => {
  it('renders latest results, insights, trends, and immutable history', () => {
    render(<MemoryRouter><LaboratoryPage /></MemoryRouter>);

    expect(screen.getByText('Laboratory Analysis')).toBeInTheDocument();
    expect(screen.getAllByText('Potassium').length).toBeGreaterThan(0);
    expect(screen.getByText('Nutrition insights')).toBeInTheDocument();
    expect(screen.getByText('Laboratory history')).toBeInTheDocument();
    expect(screen.getByText(/Historical laboratory results are clinical evidence|Laboratory results are clinical evidence/)).toBeInTheDocument();
  });

  it('allows a multi-result report to be reviewed before submission', () => {
    render(<MemoryRouter><LaboratoryPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Add report' }));
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '4.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add another result' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save report' }));

    expect(mocks.mutate).toHaveBeenCalledWith(expect.objectContaining({ results: expect.arrayContaining([expect.objectContaining({ testCode: 'creatinine' })]) }), expect.any(Object));
  });
});
