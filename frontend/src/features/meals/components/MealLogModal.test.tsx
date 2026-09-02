import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MealLogModal } from './MealLogModal';

const mocks = vi.hoisted(() => ({ createRecipe: vi.fn(), createMeal: vi.fn() }));

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
vi.mock('@/features/daily-tracker/hooks/useDailyTracker', () => ({
  useCreateDailyNutritionEntryMutation: (onSuccess?: () => void) => ({ mutate: mocks.createRecipe.mockImplementation(() => onSuccess?.()), isPending: false }),
}));
vi.mock('../hooks/useMeals', () => ({ useCreateMealMutation: (onSuccess?: () => void) => ({ mutate: mocks.createMeal.mockImplementation(() => onSuccess?.()), isPending: false }) }));
vi.mock('@/features/food-recognition/hooks/useFoodRecognition', () => ({ useFoodRecognition: () => ({ mutate: vi.fn(), isPending: false, data: undefined, reset: vi.fn() }) }));
vi.mock('@/features/dashboard/hooks/useDailyNutrition', () => ({ useDailyNutrition: () => ({ data: undefined, isLoading: false }) }));
vi.mock('@/features/dashboard/hooks/useDailyRecommendations', () => ({ useDailyRecommendations: () => ({ data: undefined }) }));
vi.mock('@/features/consultation/hooks/useNutritionConsultation', () => ({ useNutritionConsultation: () => ({ mutate: vi.fn(), isPending: false, data: undefined }) }));

describe('MealLogModal recipe logging', () => {
  beforeEach(() => {
    mocks.createRecipe.mockReset();
    mocks.createMeal.mockReset();
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

  it('keeps catalog foods and saved recipes in the same search result set', () => {
    render(<MealLogModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Type to search foods/i), { target: { value: 'green beans' } });

    expect(screen.getByRole('button', { name: /Green Beans.*Vegetables/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Green Bean Salad.*Recipe/i })).toBeInTheDocument();
  });
});
