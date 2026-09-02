import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecipesPage } from './RecipesPage';

const mocks = vi.hoisted(() => ({ addToDailyTracker: vi.fn(), save: vi.fn(), remove: vi.fn() }));

vi.mock('../hooks/useRecipes', () => ({
  useRecipes: () => ({
    isLoading: false,
    isError: false,
    data: [{
      id: 'recipe-1', ownerId: 'user-1', visibility: 'PRIVATE', isFavorite: false,
      createdAt: '2026-08-31T00:00:00.000Z', updatedAt: '2026-08-31T00:00:00.000Z',
      versions: [{
        id: 'version-1', version: 1, name: 'Chicken Rice Bowl', description: 'A simple bowl', preparationInstructions: null,
        cuisine: null, mealTypes: [], yieldServings: '2', sourceType: 'USER_CREATED', approvalStatus: 'APPROVED',
        createdAt: '2026-08-31T00:00:00.000Z', components: [{
          id: 'component-1', foodId: 'food-1', foodName: 'Chicken', foodDisplayName: 'Chicken Breast', foodVariantLabel: 'Cooked',
          servingId: 'serving-1', servingName: '1 piece', servingGrams: '100', role: 'INGREDIENT', quantity: '1', unit: 'SERVING', displayOrder: 0, notes: null,
        }],
      }],
    }],
  }),
  useRecipeNutrition: () => ({ isLoading: false, data: { recipeId: 'recipe-1', recipeVersionId: 'version-1', recipeVersion: 1, servings: '1', servingGrams: '100', nutrients: [{ name: 'Protein', unit: 'g', amount: '20' }], ingredients: [] } }),
  useRecipeEvaluation: () => ({ mutate: vi.fn(), isPending: false, data: undefined }),
  useSaveRecipe: () => ({ mutate: mocks.save, isPending: false }),
  useDeleteRecipe: () => ({ mutate: mocks.remove, isPending: false }),
  useToggleRecipeFavorite: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/features/foods/hooks/useFoods', () => ({ useFoods: () => ({ data: { items: [{ id: 'food-2', name: 'Chicken', displayName: 'Chicken Breast', variantLabel: 'Cooked', category: { id: 'category-1', name: 'Poultry', description: null } }] } }) }));
vi.mock('@/features/foods/api/foodsApi', () => ({ foodsApi: { getFoodById: vi.fn().mockResolvedValue({ id: 'food-2', name: 'Chicken', displayName: 'Chicken Breast', variantLabel: 'Cooked', category: { id: 'category-1', name: 'Poultry', description: null }, servings: [{ id: 'serving-2', name: '1 piece', grams: '100' }], nutrients: [], createdAt: '', updatedAt: '' }) } }));
vi.mock('../api/recipesApi', () => ({ recipesApi: { addToDailyTracker: mocks.addToDailyTracker } }));

afterEach(() => {
  cleanup();
  mocks.addToDailyTracker.mockReset();
});

describe('RecipesPage', () => {
  it('renders saved recipes and canonical nutrition details', () => {
    render(<MemoryRouter><RecipesPage /></MemoryRouter>);
    expect(screen.getByText('My Recipes')).toBeInTheDocument();
    expect(screen.getByText('Chicken Rice Bowl')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /chicken rice bowl/i })[0]!);
    expect(screen.getByText('20 g')).toBeInTheDocument();
    expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
  });

  it('adds a saved recipe through the recipe tracker endpoint', async () => {
    mocks.addToDailyTracker.mockResolvedValue({});
    render(<MemoryRouter><RecipesPage /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: /chicken rice bowl/i })[0]!);
    fireEvent.click(screen.getByRole('button', { name: /add to today/i }));
    expect(mocks.addToDailyTracker).toHaveBeenCalledWith('recipe-1', { servings: '1', version: 1 });
  });

  it('asks for explicit confirmation before creating a duplicate recipe name', async () => {
    render(<MemoryRouter><RecipesPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Recipe name'), { target: { value: 'Chicken Rice Bowl' } });
    fireEvent.change(screen.getByLabelText('Add ingredients'), { target: { value: 'chicken' } });
    fireEvent.click(screen.getByRole('button', { name: /Chicken Breast.*Canonical catalog food/i }));
    await waitFor(() => expect(screen.getByText('Ingredients')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save recipe' }));

    expect(screen.getByRole('alert')).toHaveTextContent('You already have a recipe named Chicken Rice Bowl.');
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
