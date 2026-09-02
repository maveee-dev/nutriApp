import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MealPlannerPage } from './MealPlannerPage';

const mocks = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock('../hooks/useMealPlanner', () => ({
  useMealPlanner: () => ({
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    data: {
      date: '2026-08-30', mealType: 'BREAKFAST', focus: 'BALANCED', limitations: [],
      foods: [{ foodId: 'food-1', name: 'Canonical Oats', displayName: 'Oats', variantLabel: 'Cooked', servingId: 'serving-1', servingName: '1 cup', servingGrams: '234', quantity: '1', score: 95, coverage: 100, evaluationStatus: 'evaluated', category: 'Grains', keyNutrients: [{ nutrient: 'protein', amount: '6', unit: 'g' }], evaluation: { score: 95, coverage: 100, reasons: [], contributions: [], deferredPolicies: [] }, nutritionInsights: [] }],
      summary: { protein: { amount: '6', unit: 'g' } },
      remainingBudget: { protein: { current: '34', target: '50', remaining: '16', unit: 'g', status: 'below-target' } },
      provenance: { foodSource: 'canonical-food-database', selection: 'deterministic', evaluatorVersion: 'food-evaluation-v3', policySetFingerprint: 'policy' },
    },
  }),
}));

vi.mock('@/features/daily-tracker/hooks/useDailyTracker', () => ({
  useCreateDailyNutritionEntryMutation: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));

afterEach(() => {
  cleanup();
  mocks.mutateAsync.mockReset();
});

describe('MealPlannerPage', () => {
  it('renders deterministic remaining budget and food recommendations', () => {
    render(<MemoryRouter><MealPlannerPage /></MemoryRouter>);
    expect(screen.getByText('Meal Planner')).toBeInTheDocument();
    expect(screen.getByText('Remaining nutrition')).toBeInTheDocument();
    expect(screen.getByText('Oats')).toBeInTheDocument();
    expect(screen.getByText(/16 g remaining/)).toBeInTheDocument();
  });

  it('adds the recommended canonical serving through the Daily Tracker mutation', async () => {
    mocks.mutateAsync.mockResolvedValue({});
    render(<MemoryRouter><MealPlannerPage /></MemoryRouter>);

    const addButton = screen.getAllByRole('button').find((button) => button.textContent?.trim() === 'Add');
    expect(addButton).toBeDefined();
    fireEvent.click(addButton as HTMLButtonElement);

    expect(mocks.mutateAsync).toHaveBeenCalledWith({ date: expect.any(String), foodId: 'food-1', servingId: 'serving-1', servings: '1' });
  });
});
