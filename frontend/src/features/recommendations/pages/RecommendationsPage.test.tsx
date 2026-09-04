import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecommendationsPage } from './RecommendationsPage';

const mocks = vi.hoisted(() => ({ add: vi.fn(), refetch: vi.fn() }));

vi.mock('../hooks/useRecommendations', () => ({
  useRecommendations: () => ({
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
    data: {
      date: '2026-08-31', goal: 'BALANCED', mealType: null,
      recommendations: [{
        foodId: 'food-1', canonicalName: 'Rice, white, cooked', displayName: 'White Rice', variantLabel: 'Cooked', category: 'Grains', servingId: 'serving-1', servingName: '1 cup', servingGrams: '158', quantity: '1', compatibilityScore: 95, coverage: 100, evaluationStatus: 'evaluated',
        remainingBudgetImpact: [{ nutrient: 'protein', amount: '4', unit: 'g', target: '50', remainingBefore: '20', remainingAfter: '16', targetConfigured: true }],
        nutritionHighlights: [{ nutrient: 'carbohydrates', amount: '45', unit: 'g' }], limitations: [], nutritionInsights: [], whyRecommended: 'White Rice: It was selected as a balanced option.',
        evaluation: { score: 95, coverage: 100, reasons: [], contributions: [], deferredPolicies: [] },
      }],
      remainingBudget: { protein: { current: '30', target: '50', remaining: '20', unit: 'g', status: 'below-target' } },
      laboratoryConsiderations: [], profileConsiderations: ['Recommendations account for your recorded conditions: CKD.'], limitations: [],
      provenance: { foodSource: 'canonical-food-database', selection: 'deterministic', evaluatorVersion: 'food-evaluation-v3', policySetFingerprint: 'policy', activeTargetIds: [] },
    },
  }),
}));

vi.mock('@/features/daily-tracker/hooks/useDailyTracker', () => ({
  useCreateDailyNutritionEntryMutation: () => ({ mutateAsync: mocks.add, isPending: false }),
}));

vi.mock('@/features/foods/api/foodsApi', () => ({
  foodsApi: { getFoodById: vi.fn().mockResolvedValue({ id: 'food-1', name: 'Rice, white, cooked', displayName: 'White Rice', variantLabel: 'Cooked', category: { id: 'category-1', name: 'Grains', description: null }, servings: [{ id: 'serving-1', name: '1 cup', grams: '158' }], nutrients: [], createdAt: '', updatedAt: '' }) },
}));

vi.mock('@/features/food-evaluation/components/FoodEvaluationModal', () => ({ FoodEvaluationModal: () => null }));

afterEach(() => {
  cleanup();
  mocks.add.mockReset();
});

describe('RecommendationsPage', () => {
  it('renders recommended food, budget context, and deterministic explanation', () => {
    render(<MemoryRouter><RecommendationsPage /></MemoryRouter>);
    expect(screen.getByText('Recommended for you')).toBeInTheDocument();
    expect(screen.getByText('White Rice')).toBeInTheDocument();
    expect(screen.getByText(/20 g remaining/)).toBeInTheDocument();
    expect(screen.getByText(/selected as a balanced option/)).toBeInTheDocument();
  });

  it('adds the canonical serving through the Daily Tracker mutation', async () => {
    mocks.add.mockResolvedValue({});
    render(<MemoryRouter><RecommendationsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /add to daily intake/i }));
    expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({ foodId: 'food-1', servingId: 'serving-1', servings: '1' }));
  });
});
