import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MealLogModal } from './MealLogModal';

const mocks = vi.hoisted(() => ({ createRecipe: vi.fn(), createMeal: vi.fn(), recipeEvaluate: vi.fn() }));

vi.mock('@/features/foods/hooks/useFoods', () => ({ useFoods: (query: { search?: string }) => ({ data: { items: query.search?.toLowerCase().includes('green') ? [{ id: 'food-2', name: 'Green Beans', displayName: 'Green Beans', variantLabel: null, category: { id: 'category-1', name: 'Vegetables', description: null } }] : [] }, isLoading: false }) }));
vi.mock('@/features/foods/api/foodsApi', () => ({ foodsApi: { getFoodById: vi.fn() } }));
vi.mock('@/features/recipes/hooks/useRecipes', () => ({
  useRecipes: () => ({ data: [{
    id: 'recipe-1', ownerId: 'user-1', visibility: 'PRIVATE', isFavorite: false,
    createdAt: '2026-08-31T00:00:00.000Z', updatedAt: '2026-08-31T00:00:00.000Z',
    versions: [{ id: 'version-1', version: 1, name: 'Chicken Adobo', yieldServings: '4', components: [] }],
  }, {
    id: 'recipe-2', ownerId: 'user-1', visibility: 'PRIVATE', isFavorite: false,
    createdAt: '2026-08-31T00:00:00.000Z', updatedAt: '2026-08-31T00:00:00.000Z',
    versions: [{ id: 'version-2', version: 1, name: 'Green Bean Salad', yieldServings: '2', components: [] }],
  }] }),
}));
vi.mock('@/features/recipes/api/recipesApi', () => ({ recipesApi: { evaluate: mocks.recipeEvaluate } }));
vi.mock('@/features/food-evaluation/hooks/useFoodEvaluation', () => ({
  useFoodEvaluation: () => ({ mutate: vi.fn(), isPending: false, data: null, error: null }),
}));
vi.mock('@/features/daily-tracker/hooks/useDailyTracker', () => ({
  useCreateDailyNutritionEntryMutation: (onSuccess?: () => void) => ({ mutate: mocks.createRecipe.mockImplementation(() => onSuccess?.()), isPending: false }),
}));
vi.mock('../hooks/useMeals', () => ({ useCreateMealMutation: (onSuccess?: () => void) => ({ mutate: mocks.createMeal.mockImplementation(() => onSuccess?.()), isPending: false }) }));
vi.mock('@/features/food-recognition/hooks/useFoodRecognition', () => ({ useFoodRecognition: () => ({ mutate: vi.fn(), isPending: false, data: undefined, reset: vi.fn() }) }));
vi.mock('@/features/dashboard/hooks/useDailyNutrition', () => ({ useDailyNutrition: () => ({ data: undefined, isLoading: false }) }));
vi.mock('@/features/dashboard/hooks/useDailyRecommendations', () => ({ useDailyRecommendations: () => ({ data: undefined }) }));
vi.mock('@/features/consultation/hooks/useNutritionConsultation', () => ({ useNutritionConsultation: () => ({ mutate: vi.fn(), isPending: false, data: undefined }) }));

describe('MealLogModal recipe logging', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mocks.createRecipe.mockReset();
    mocks.createMeal.mockReset();
    mocks.recipeEvaluate.mockReset();
    mocks.recipeEvaluate.mockResolvedValue({ evaluation: { score: 86, coverage: 80, deferredPolicies: [] } });
  });

  it('shows private recipes in the existing log-meal search and writes a tracker recipe entry', () => {
    render(<MealLogModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search foods/i), { target: { value: 'chicken adobo' } });
    fireEvent.click(screen.getByRole('button', { name: /Chicken Adobo.*Recipe/i }));
    const quantities = screen.getAllByRole('spinbutton');
    fireEvent.change(quantities[quantities.length - 1]!, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add recipe to intake' }));

    expect(mocks.createRecipe).toHaveBeenCalledWith({
      date: expect.any(String),
      recipeId: 'recipe-1',
      recipeVersionId: 'version-1',
      servings: '2',
    });
    expect(mocks.createMeal).not.toHaveBeenCalled();
  });

  it('shows the deterministic recipe compatibility result before logging it', async () => {
    render(<MealLogModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search foods/i), { target: { value: 'chicken adobo' } });
    fireEvent.click(screen.getByRole('button', { name: /Chicken Adobo.*Recipe/i }));

    fireEvent.click(screen.getByRole('button', { name: 'View compatibility before adding' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Can I eat this?' })).toBeInTheDocument());
    expect(screen.getByText('Compatibility check is incomplete')).toBeInTheDocument();
    expect(screen.getByText('Supporting score')).toBeInTheDocument();
    expect(screen.getByText('86')).toBeInTheDocument();
    expect(mocks.recipeEvaluate).toHaveBeenCalledWith('recipe-1', { version: 1, servings: '1' });
  });

  it('keeps catalog foods and saved recipes in the same search result set', () => {
    render(<MealLogModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search foods/i), { target: { value: 'green beans' } });

    expect(screen.getByRole('button', { name: /Green Beans.*Vegetables/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Green Bean Salad.*Recipe/i })).toBeInTheDocument();
  });
});
