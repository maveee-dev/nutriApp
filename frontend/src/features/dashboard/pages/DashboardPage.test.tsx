import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';

const mocks = vi.hoisted(() => ({
  dashboard: {
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    data: {
      greeting: { greeting: 'Good morning', displayName: 'Alex', date: '2026-08-31', profileSummary: { conditions: ['Chronic Kidney Disease'], dialysis: 'Hemodialysis' } },
      nutritionProgress: [
        { nutrient: 'Calories', consumed: '450', target: '2000', remaining: '1550', unit: 'kcal', targetConfigured: true, percentageConsumed: 22.5, status: 'within-target' },
        { nutrient: 'Protein', consumed: '20', target: null, remaining: null, unit: 'g', targetConfigured: false, percentageConsumed: null, status: 'not-configured' },
      ],
      nutritionInsights: [],
      laboratorySummary: { latestReport: { id: 'report-1', reportDate: '2026-08-30', source: 'manual', createdAt: '2026-08-30T00:00:00.000Z' }, results: [{ id: 'result-1', reportId: 'report-1', testCode: 'potassium', testName: 'Potassium', value: '5.8', unit: 'mmol/L', referenceLow: '3.5', referenceHigh: '5.1', flag: null, status: 'high', message: 'High', reportDate: '2026-08-30' }], importantResults: [], trends: [], insights: [] },
      mealPlanner: { recommendation: { date: '2026-08-31', mealType: 'BREAKFAST', focus: 'BALANCED', foods: [{ foodId: 'food-1', displayName: 'Oatmeal', variantLabel: null, servingId: 'serving-1', servingName: '1 bowl', servingGrams: '240', quantity: '1', score: 95, coverage: 100, evaluationStatus: 'evaluated', keyNutrients: [] }], summary: {}, remainingBudget: {}, limitations: [] }, remainingMeals: null },
      dailyFoods: [{ id: 'entry-1', foodId: 'food-1', servingId: 'serving-1', displayName: 'Oatmeal', variantLabel: null, servingName: '1 bowl', servingGrams: '240', quantity: '1', compatibilityScore: null, evaluationStatus: 'not-available' }],
      compatibilitySummary: { averageScore: 90, evaluated: 2, partiallyEvaluated: 1, insufficientEvidence: 0 },
      healthNotices: [{ category: 'potassium', severity: 'warning', title: 'More information needed', message: 'Review this result.', source: 'laboratory' }],
    },
  },
}));

vi.mock('../hooks/useHealthDashboard', () => ({ useHealthDashboard: () => mocks.dashboard }));

afterEach(() => cleanup());

describe('DashboardPage', () => {
  it('renders the deterministic dashboard sections', () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.getByText('Good morning, Alex')).toBeInTheDocument();
    expect(screen.getByText("Today's nutrition")).toBeInTheDocument();
    expect(screen.getByText('Health notices')).toBeInTheDocument();
    expect(screen.getByText('Latest laboratory')).toBeInTheDocument();
    expect(screen.getByText("Today's meals")).toBeInTheDocument();
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
    expect(screen.getByText('Recommended next step')).toBeInTheDocument();
    expect(screen.getByText('Compatibility today')).toBeInTheDocument();
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(screen.getByText('90/100')).toBeInTheDocument();
    expect(screen.getByText('Intake only')).toBeInTheDocument();
    expect(screen.getByText(/Protein: 20 g/)).toBeInTheDocument();
  });

  it('renders the recipe summary when recipes are available', () => {
    mocks.dashboard.data = {
      ...mocks.dashboard.data,
      recipeSummary: {
        recent: [{ recipeId: 'recipe-1', recipeVersionId: 'version-1', name: 'Chicken Adobo', isFavorite: true, updatedAt: '2026-08-31T12:00:00.000Z', compatibilityScore: null, coverage: null }],
        favorites: [{ recipeId: 'recipe-1', recipeVersionId: 'version-1', name: 'Chicken Adobo', isFavorite: true, updatedAt: '2026-08-31T12:00:00.000Z', compatibilityScore: null, coverage: null }],
        today: [{ recipeId: 'recipe-1', recipeVersionId: 'version-1', name: 'Chicken Adobo', isFavorite: true, updatedAt: '2026-08-31T12:00:00.000Z', compatibilityScore: null, coverage: null }],
        recentEvaluated: [{ recipeId: 'recipe-1', recipeVersionId: 'version-1', name: 'Chicken Adobo', isFavorite: true, updatedAt: '2026-08-31T12:00:00.000Z', compatibilityScore: 88, coverage: 100 }],
      },
    } as never;
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(screen.getAllByText('Chicken Adobo')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'View all recipes' })).toBeInTheDocument();
  });

  it('renders loading and empty states', () => {
    mocks.dashboard.isLoading = true;
    mocks.dashboard.data = undefined as never;
    const { unmount } = render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText('Preparing your health dashboard...')).toBeInTheDocument();
    unmount();

    mocks.dashboard.isLoading = false;
    mocks.dashboard.data = null as never;
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText('Your dashboard is not available')).toBeInTheDocument();
  });
});
