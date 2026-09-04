import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DailyNutritionPage } from './DailyNutritionPage';

const mocks = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('../hooks/useDailyTracker', () => ({
  useDailyTracker: () => ({ data: { entries: [], totals: {}, targets: {} }, isLoading: false, isError: false }),
  useCreateDailyNutritionEntryMutation: (onSuccess?: () => void) => ({ mutate: mocks.create.mockImplementation(() => onSuccess?.()), isPending: false }),
  useUpdateDailyNutritionEntryMutation: () => ({ mutate: vi.fn() }),
  useDeleteDailyNutritionEntryMutation: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/features/foods/hooks/useFoods', () => ({ useFoods: () => ({ data: { items: [] }, isLoading: false }) }));
vi.mock('@/features/foods/api/foodsApi', () => ({ foodsApi: { getFoodById: vi.fn() } }));
vi.mock('@/features/recipes/hooks/useRecipes', () => ({
  useRecipes: () => ({
    data: [{
      id: 'recipe-1', ownerId: 'user-1', visibility: 'PRIVATE', isFavorite: false,
      createdAt: '2026-08-31T00:00:00.000Z', updatedAt: '2026-08-31T00:00:00.000Z',
      versions: [{ id: 'version-1', version: 1, name: 'Chicken Adobo', yieldServings: '4', components: [] }],
    }],
  }),
}));

describe('DailyNutritionPage recipe logging', () => {
  beforeEach(() => mocks.create.mockReset());

  it('finds a private recipe and submits its immutable version and eaten serving count', () => {
    render(<MemoryRouter><DailyNutritionPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Log food or recipe' }));
    fireEvent.change(screen.getByLabelText(/Search foods or saved recipes/i), { target: { value: 'chicken adobo' } });
    fireEvent.click(screen.getByRole('button', { name: /Chicken Adobo.*Recipe/i }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add recipe to intake' }));

    expect(mocks.create).toHaveBeenCalledWith({
      date: expect.any(String),
      recipeId: 'recipe-1',
      recipeVersionId: 'version-1',
      servings: '2',
    });
  });
});
