import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/store/useToastStore';
import { recipesApi } from '../api/recipesApi';
import type { RecipeRequest } from '../types/recipe.types';

export const useRecipes = () => useQuery({ queryKey: ['recipes'], queryFn: recipesApi.list, staleTime: 60_000 });

export const useRecipeNutrition = (id?: string) => useQuery({ queryKey: ['recipe-nutrition', id], queryFn: () => recipesApi.nutrition(id!), enabled: !!id });

export const useRecipeEvaluation = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({ mutationFn: ({ id, servings, version }: { id: string; servings?: string; version?: number }) => recipesApi.evaluate(id, { servings, version }), onSuccess: (_data, variables) => { void queryClient.invalidateQueries({ queryKey: ['recipe-evaluation', variables.id] }); }, onError: (error: Error) => showToast({ type: 'error', title: 'Could not evaluate recipe', message: error.message }) });
};

export const useSaveRecipe = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({ mutationFn: ({ id, data }: { id?: string; data: RecipeRequest }) => id ? recipesApi.update(id, data) : recipesApi.create(data), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['recipes'] }); showToast({ type: 'success', title: 'Recipe saved', message: 'Your recipe uses canonical food data and is ready to evaluate.' }); }, onError: (error: Error) => showToast({ type: 'error', title: 'Could not save recipe', message: error.message }) });
};

export const useDeleteRecipe = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({ mutationFn: recipesApi.remove, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['recipes'] }); showToast({ type: 'info', title: 'Recipe deleted', message: 'The recipe was removed.' }); }, onError: (error: Error) => showToast({ type: 'error', title: 'Could not delete recipe', message: error.message }) });
};

export const useToggleRecipeFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) => recipesApi.update(id, { isFavorite }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['recipes'] }); },
  });
};
