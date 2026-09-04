import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { useFoods } from '@/features/foods/hooks/useFoods';
import { foodsApi } from '@/features/foods/api/foodsApi';
import { useCreateMealMutation } from '../hooks/useMeals';
import { FoodEvaluationModal } from '@/features/food-evaluation/components/FoodEvaluationModal';
import type { FoodEvaluationRecipeContext } from '@/features/food-evaluation/components/FoodEvaluationModal';
import { useFoodRecognition } from '@/features/food-recognition/hooks/useFoodRecognition';
import { useDailyNutrition } from '@/features/dashboard/hooks/useDailyNutrition';
import { useDailyRecommendations } from '@/features/dashboard/hooks/useDailyRecommendations';
import { useNutritionConsultation } from '@/features/consultation/hooks/useNutritionConsultation';
import { Trash2, Sparkles, Search, Camera, Coffee, Sun, Moon, Apple, Plus, Utensils, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { MealType } from '../types/meals.types';
import type { FoodDetail, Serving } from '@/features/foods/types/foods.types';
import { formatServingLabel, preferredServing } from '@/features/foods/utils/serving';
import { format } from 'date-fns';
import { mergeMealDraftItem } from '../utils/mealDraft';
import { optimizeImage } from '@/features/food-recognition/image-optimizer';
import { useRecipes } from '@/features/recipes/hooks/useRecipes';
import type { Recipe } from '@/features/recipes/types/recipe.types';
import { recipeMatchesQuery } from '@/features/recipes/recipeSearch';
import { useCreateDailyNutritionEntryMutation } from '@/features/daily-tracker/hooks/useDailyTracker';

export interface MealLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
}

interface StagedMealItem {
  id: string; // unique local ID for list rendering
  foodId: string;
  foodName: string;
  foodDisplayName?: string;
  foodVariantLabel?: string | null;
  categoryName: string;
  isLoadingDetails: boolean;
  fetchError: string | null;
  servings: Serving[];
  selectedServingId: string;
  quantity: string;
  foodDetail: FoodDetail | null;
  nutritionSource: 'canonical-database' | 'ai-estimated';
}

function recipeResultDetails(recipe: Recipe): string {
  const version = recipe.versions[0];
  const ingredientNames = (version?.components ?? [])
    .map((component) => component.foodDisplayName || component.foodName)
    .filter(Boolean)
    .slice(0, 3);
  const created = Number.isNaN(new Date(recipe.createdAt).getTime())
    ? null
    : `Created ${format(new Date(recipe.createdAt), 'MMM d')}`;
  return [
    recipe.ownerId == null ? 'Shared recipe' : 'My recipe',
    version?.yieldServings ? `Makes ${version.yieldServings} servings` : null,
    created,
    ingredientNames.length > 0 ? ingredientNames.join(', ') : null,
  ].filter((value): value is string => Boolean(value)).join(' · ');
}

export const MealLogModal: React.FC<MealLogModalProps> = ({
  isOpen,
  onClose,
  defaultMealType = 'BREAKFAST',
}) => {
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [consumedAt, setConsumedAt] = useState<string>(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [searchQuery, setSearchQuery] = useState('');
  const [stagedItems, setStagedItems] = useState<StagedMealItem[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeServings, setRecipeServings] = useState('1');
  const [inputMode, setInputMode] = useState<'search' | 'scan'>('search');
  const [recognitionImage, setRecognitionImage] = useState<string | null>(null);
  const [recognitionMimeType, setRecognitionMimeType] = useState('image/jpeg');
  const [isComplete, setIsComplete] = useState(false);

  // Pre-evaluation modal state
  const [evaluatingItem, setEvaluatingItem] = useState<{
    food: FoodDetail;
    serving: Serving;
    quantity: string;
  } | null>(null);
  const [evaluatingRecipe, setEvaluatingRecipe] = useState<FoodEvaluationRecipeContext | null>(null);

  // Search Foods Query
  const { data: foodsData, isLoading: isFoodsLoading } = useFoods({ search: searchQuery, limit: 15 });
  const { data: recipesData, isLoading: isRecipesLoading } = useRecipes();
  const foodRecognition = useFoodRecognition();
  const dailyDate = format(new Date(), 'yyyy-MM-dd');
  const { data: completionNutrition, isLoading: isCompletionNutritionLoading } = useDailyNutrition(dailyDate);
  const { data: completionRecommendations } = useDailyRecommendations(dailyDate);
  const completionConsultation = useNutritionConsultation();

  const createMealMutation = useCreateMealMutation(() => {
    setIsComplete(true);
    completionConsultation.mutate({ question: 'How did this meal affect my goals?', date: dailyDate });
  });
  const createRecipeEntryMutation = useCreateDailyNutritionEntryMutation(() => {
    setIsComplete(true);
    completionConsultation.mutate({ question: 'How did this meal affect my goals?', date: dailyDate });
  });

  const resetForm = () => {
    setStagedItems([]);
    setSelectedRecipe(null);
    setRecipeServings('1');
    setSearchQuery('');
    setEvaluatingItem(null);
    setEvaluatingRecipe(null);
    setInputMode('search');
    setRecognitionImage(null);
    foodRecognition.reset();
    setIsComplete(false);
  };

  const fetchFoodDetails = async (localId: string, foodId: string) => {
    try {
      const detail = await foodsApi.getFoodById(foodId);
      const availableServings = detail.servings && detail.servings.length > 0
        ? detail.servings
        : [{ id: 'default', name: '100 g standard', grams: '100' }];

      const defaultServing = preferredServing(availableServings) ?? availableServings[0];

      setStagedItems((prev) => {
        const item = prev.find(({ id }) => id === localId);
        if (!item) return prev;

        return mergeMealDraftItem(
          prev.filter(({ id }) => id !== localId),
          {
            ...item,
            isLoadingDetails: false,
            fetchError: null,
            servings: availableServings,
            selectedServingId: defaultServing.id,
            foodDetail: detail,
          },
        );
      });
    } catch (err: unknown) {
      const errorObj = err as { message?: string; status?: number; response?: unknown; data?: unknown; url?: string; stack?: string };
      const status = errorObj?.status;
      const responseData = errorObj?.response || errorObj?.data;
      const message = errorObj?.message || String(err);

      console.error('[MealLogModal] fetchFoodDetails failed:', {
        foodId,
        status,
        message,
        responseData,
        url: errorObj?.url,
        stack: errorObj?.stack,
      });

      const formattedError = `Failed to load servings [Status: ${status || 'N/A'}] - ${message}${
        responseData ? ` (${JSON.stringify(responseData)})` : ''
      }`;

      setStagedItems((prev) =>
        prev.map((item) =>
          item.id === localId
            ? {
                ...item,
                isLoadingDetails: false,
                fetchError: formattedError,
              }
            : item
        )
      );
    }
  };

  // When user clicks a food from search results:
  const handleSelectFood = (foodId: string, foodName: string, categoryName: string, foodDisplayName?: string, foodVariantLabel?: string | null) => {
    const localId = Math.random().toString(36).substring(2, 9);

    setSelectedRecipe(null);
    // Create optimistic staged item
    const newItem: StagedMealItem = {
      id: localId,
      foodId,
      foodName,
      foodDisplayName,
      foodVariantLabel,
      categoryName,
      isLoadingDetails: true,
      fetchError: null,
      servings: [],
      selectedServingId: '',
      quantity: '1.0',
      foodDetail: null,
      nutritionSource: 'canonical-database',
    };

    // Immediately add to staged items and clear search query
    setStagedItems((prev) => [...prev, newItem]);
    setSearchQuery('');

    // Fetch full food details for servings and nutrients
    fetchFoodDetails(localId, foodId);
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setRecipeServings('1');
    setEvaluatingRecipe(null);
    setSearchQuery('');
    setStagedItems([]);
  };

  const handleServingChange = (localId: string, servingId: string) => {
    setStagedItems((prev) => {
      const item = prev.find(({ id }) => id === localId);
      if (!item) return prev;

      return mergeMealDraftItem(
        prev.filter(({ id }) => id !== localId),
        { ...item, selectedServingId: servingId },
      );
    });
  };

  const handleQuantityChange = (localId: string, quantity: string) => {
    setStagedItems((prev) =>
      prev.map((item) => (item.id === localId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (localId: string) => {
    setStagedItems((prev) => prev.filter((item) => item.id !== localId));
  };

  const handleOpenEvaluation = (item: StagedMealItem) => {
    if (!item.foodDetail) return;
    const serving = item.servings.find((s) => s.id === item.selectedServingId) || item.servings[0];
    if (!serving) return;

    setEvaluatingItem({
      food: item.foodDetail,
      serving,
      quantity: item.quantity,
    });
  };

  const handleOpenRecipeEvaluation = () => {
    const version = selectedRecipe?.versions[0];
    if (!selectedRecipe || !version || parseFloat(recipeServings) <= 0) return;

    setEvaluatingRecipe({
      id: selectedRecipe.id,
      version: version.version,
      name: version.name,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecipe) {
      const version = selectedRecipe.versions[0];
      if (!version || parseFloat(recipeServings) <= 0) return;
      createRecipeEntryMutation.mutate({
        date: format(new Date(consumedAt), 'yyyy-MM-dd'),
        recipeId: selectedRecipe.id,
        recipeVersionId: version.id,
        servings: recipeServings,
      });
      return;
    }
    if (stagedItems.length === 0) return;

    // Build payload with valid serving items
    const validItems = stagedItems
      .filter((item) => Boolean(item.selectedServingId) && parseFloat(item.quantity) > 0)
      .map((item) => ({
        servingId: item.selectedServingId,
        quantity: item.quantity,
      }));

    if (validItems.length === 0) return;

    createMealMutation.mutate({
      mealType,
      consumedAt: new Date(consumedAt).toISOString(),
      items: validItems,
    });
  };

  // Validation logic for submit button
  const canSubmit = selectedRecipe
    ? Boolean(selectedRecipe.versions[0]) && parseFloat(recipeServings) > 0
    : stagedItems.length > 0 &&
    stagedItems.every(
      (item) =>
        !item.isLoadingDetails &&
        Boolean(item.selectedServingId) &&
        parseFloat(item.quantity) > 0 &&
        !item.fetchError
    );

  const searchResults = foodsData?.items || [];
  const recipeSearchResults = useMemo(() => {
    return (recipesData ?? []).filter((recipe) => recipeMatchesQuery(recipe, searchQuery));
  }, [recipesData, searchQuery]);

  const handleRecognitionFile = async (file?: File) => {
    if (!file) return;
    try {
      const optimized = await optimizeImage(file);
      setRecognitionMimeType(optimized.mimeType);
      setRecognitionImage(optimized.imageData);
    } catch {
      setRecognitionImage(null);
      setRecognitionMimeType('image/jpeg');
    }
  };

  const handleRecognize = () => {
    if (recognitionImage) foodRecognition.mutate({ imageData: recognitionImage, mimeType: recognitionMimeType });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (isComplete) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Meal logged!" subtitle="Your daily guidance has been refreshed." maxWidth="580px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-primary)' }}><CheckCircle2 size={24} /><strong>Nice work — your meal is part of today’s progress.</strong></div>
          {isCompletionNutritionLoading ? <LoadingSpinner label="Refreshing today’s goals..." size={20} /> : completionNutrition && <div style={{ padding: 12, backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><strong>Today’s progress updated</strong><p style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{completionNutrition.mealCount} meals logged. Your goals and evidence-backed guidance now include this meal.</p></div>}
          {completionRecommendations?.recommendations.slice(0, 2).map((recommendation) => <div key={recommendation.id} style={{ padding: 12, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}><strong>{recommendation.title}</strong><p style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{recommendation.message}</p></div>)}
          {completionConsultation.isPending ? <LoadingSpinner label="Preparing a friendly explanation..." size={20} /> : completionConsultation.data && <div style={{ padding: 12, backgroundColor: 'var(--color-primary-subtle)', borderRadius: 'var(--radius-md)' }}><strong>Coach note</strong><p style={{ marginTop: 4, fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{completionConsultation.data.answer}</p></div>}
          <Button variant="primary" onClick={handleClose}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Build a meal"
        subtitle="Add the foods or recipes you consumed, then save them together in your daily log."
        maxWidth="580px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Meal Time Selector */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Meal Time
            </label>
            <SegmentedControl<MealType>
              value={mealType}
              onChange={setMealType}
              options={[
                { value: 'BREAKFAST', label: 'Breakfast', icon: <Coffee size={15} /> },
                { value: 'LUNCH', label: 'Lunch', icon: <Sun size={15} /> },
                { value: 'DINNER', label: 'Dinner', icon: <Moon size={15} /> },
                { value: 'SNACK', label: 'Snack', icon: <Apple size={15} /> },
              ]}
            />
          </div>

          {/* Consumed At Date Input */}
          <Input
            label="Date & Time"
            type="datetime-local"
            value={consumedAt}
            onChange={(e) => setConsumedAt(e.target.value)}
            required
          />

          {/* Food input: search or recognition */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <SegmentedControl<'search' | 'scan'> value={inputMode} onChange={setInputMode} options={[{ value: 'search', label: 'Search', icon: <Search size={15} /> }, { value: 'scan', label: 'Scan image', icon: <Camera size={15} /> }]} />
            {inputMode === 'search' ? <><label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Search & Add Foods or Recipes</label><Input placeholder="Type to search foods or saved recipes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} leftIcon={<Search size={16} />} autoComplete="off" /></> : <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-full)', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer' }}><Camera size={16} /> Choose image<input type="file" accept="image/*" capture="environment" hidden onChange={(event) => handleRecognitionFile(event.target.files?.[0])} /></label><Button type="button" size="sm" variant="primary" onClick={handleRecognize} disabled={!recognitionImage || foodRecognition.isPending}>Recognize</Button>{recognitionImage && <Badge variant="success">Image ready</Badge>}</div>}

            {inputMode === 'scan' && foodRecognition.isPending && <LoadingSpinner label="Recognizing foods..." size={18} />}
            {inputMode === 'scan' && foodRecognition.data?.candidates.map((candidate) => <div key={`${candidate.label}-${candidate.foodId ?? 'unmatched'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}><span><strong>{candidate.foodDisplayName ?? candidate.foodName ?? candidate.label}</strong>{candidate.foodVariantLabel && <small style={{ display: 'block', color: 'var(--text-muted)' }}>{candidate.foodVariantLabel}</small>}<small style={{ display: 'block', color: 'var(--text-muted)' }}>{Math.round(candidate.confidence * 100)}% · {candidate.nutritionSource === 'canonical-database' ? 'Canonical nutrition' : 'Review required'}</small></span>{candidate.foodId ? <Button type="button" size="sm" variant="secondary" onClick={() => handleSelectFood(candidate.foodId!, candidate.foodName ?? candidate.label, 'Recognized food', candidate.foodDisplayName ?? undefined, candidate.foodVariantLabel)}>Confirm</Button> : <Badge variant="warning">Replace in catalog</Badge>}</div>)}

            {/* Live Search Dropdown */}
            {searchQuery && (searchResults.length > 0 || recipeSearchResults.length > 0 || isFoodsLoading || isRecipesLoading) ? (
              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  backgroundColor: 'var(--bg-surface)',
                  padding: '6px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-light)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {(isFoodsLoading || isRecipesLoading) && <div style={{ padding: '6px' }}><LoadingSpinner label="Searching foods and recipes..." size={18} /></div>}
                {searchResults.length > 0 && <p style={{ padding: '4px 6px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700 }}>Catalog foods</p>}
                {searchResults.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => handleSelectFood(food.id, food.name, food.category?.name || 'General', food.displayName, food.variantLabel)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      transition: 'background-color var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Plus size={16} color="var(--color-primary)" />
                      <span><span style={{ display: 'block' }}>{food.displayName ?? food.name}</span>{food.variantLabel && <small style={{ display: 'block', color: 'var(--text-muted)', fontWeight: 500 }}>{food.variantLabel}</small>}{food.description && <small style={{ display: 'block', color: 'var(--text-muted)', fontWeight: 400 }}>{food.description}</small>}</span>
                    </div>
                    <Badge variant="neutral" size="sm">
                      {food.category.name}
                    </Badge>
                  </button>
                ))}
                {recipeSearchResults.length > 0 && <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 4, paddingTop: 6 }}><p style={{ padding: '4px 6px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700 }}>Saved recipes</p>{recipeSearchResults.map((recipe) => { const version = recipe.versions[0]; return <button key={recipe.id} type="button" onClick={() => handleSelectRecipe(recipe)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', backgroundColor: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-primary)' }}><strong>{version?.name ?? 'Untitled recipe'}</strong><small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>{recipeResultDetails(recipe)}</small></button>; })}</div>}
              </div>
            ) : searchQuery && !isFoodsLoading && !isRecipesLoading && searchResults.length === 0 && recipeSearchResults.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '4px 2px' }}>
                No foods found matching "{searchQuery}".
              </p>
            ) : null}
          </div>

          {selectedRecipe && <div style={{ padding: 14, backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-light)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}><div><strong style={{ display: 'block', fontSize: '0.98rem' }}>{selectedRecipe.versions[0]?.name ?? 'Untitled recipe'}</strong><small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 3 }}>Recipe · Makes {selectedRecipe.versions[0]?.yieldServings ?? '—'} servings</small></div><Button type="button" size="sm" variant="secondary" onClick={() => setSelectedRecipe(null)}>Choose another</Button></div><div style={{ marginTop: 12 }}><label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>How many servings did you eat?</label><QuantityStepper value={recipeServings} onChange={setRecipeServings} min={0.25} step={0.25} readOnly={false} unitLabel="serving(s)" /></div><p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 8 }}>Your recipe stays unchanged; this only records the portion you ate.</p></div>}
          {selectedRecipe?.versions[0] && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleOpenRecipeEvaluation}
                leftIcon={<Sparkles size={14} color="var(--color-primary)" />}
              >
                View compatibility before adding
              </Button>
            </div>
          )}

          {/* Staged Items / Meal List */}
          {!selectedRecipe && <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Meal Items ({stagedItems.length})
              </label>
              {stagedItems.length > 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                  ✓ {stagedItems.length} {stagedItems.length === 1 ? 'food added' : 'foods added'}
                </span>
              )}
            </div>

            {stagedItems.length === 0 ? (
              <div
                style={{
                  padding: 'var(--space-lg)',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px dashed var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Utensils size={24} color="var(--text-muted)" />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Search for a food or saved recipe above to add it to this meal.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stagedItems.map((item) => {
                  const selectedServing = item.servings.find((s) => s.id === item.selectedServingId) || item.servings[0];
                  const servingGrams = selectedServing ? parseFloat(selectedServing.grams) || 0 : 0;
                  const qtyNum = parseFloat(item.quantity) || 0;
                  const totalGrams = Math.round(qtyNum * servingGrams * 10) / 10;

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '14px',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1.5px solid var(--border-light)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Item Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.975rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.foodDisplayName ?? item.foodName}
                          </span>
                          {item.foodVariantLabel && <small style={{ color: 'var(--text-muted)' }}>{item.foodVariantLabel}</small>}
                          <Badge variant="neutral" size="sm">
                            {item.categoryName}
                          </Badge>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remove Item"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-danger)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Serving & Quantity Controls */}
                      {item.isLoadingDetails ? (
                        <div style={{ padding: '8px 0' }}>
                          <LoadingSpinner label="Loading serving options & nutrients..." size={18} />
                        </div>
                      ) : item.fetchError ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: 'var(--color-danger-subtle)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-danger)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertCircle size={16} />
                            <span>{item.fetchError}</span>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchFoodDetails(item.id, item.foodId)}
                            leftIcon={<RefreshCw size={14} />}
                          >
                            Retry
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* Portion Definition Selector */}
                          <div>
                            <label
                              htmlFor={`portion-select-${item.id}`}
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                display: 'block',
                                marginBottom: '4px',
                              }}
                            >
                              Serving or household measure
                            </label>
                            {item.servings.length > 1 ? (
                              <Select
                                id={`portion-select-${item.id}`}
                                value={item.selectedServingId}
                                onChange={(e) => handleServingChange(item.id, e.target.value)}
                                options={item.servings.map((s) => ({
                                  value: s.id,
                              label: formatServingLabel(s),
                                }))}
                              />
                            ) : selectedServing ? (
                              <div
                                style={{
                                  padding: '8px 12px',
                                  backgroundColor: 'var(--bg-surface-secondary)',
                                  borderRadius: 'var(--radius-md)',
                                  border: '1px solid var(--border-light)',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  color: 'var(--text-primary)',
                                }}
                              >
                                Serving: {formatServingLabel(selectedServing)}
                              </div>
                            ) : null}
                          </div>

                          {/* Quantity Stepper & Calculated Weight Summary */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '8px',
                              padding: '8px 12px',
                              backgroundColor: 'var(--bg-surface-secondary)',
                              borderRadius: 'var(--radius-md)',
                            }}
                          >
                            <div>
                              <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                How many servings?
                              </label>
                              <QuantityStepper
                                value={item.quantity}
                                onChange={(val) => handleQuantityChange(item.id, val)}
                                step={0.25}
                                min={0.25}
                              />
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                                Total Amount
                              </span>
                              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary-shadow)' }}>
                                {totalGrams} g
                              </span>
                              {selectedServing && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                                  ({qtyNum} × {formatServingLabel(selectedServing)})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Check Score Action */}
                          {item.foodDetail && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenEvaluation(item)}
                                leftIcon={<Sparkles size={14} color="var(--color-primary)" />}
                              >
                                View compatibility before adding
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>}

          {/* Modal Actions & Submit Feedback */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'var(--space-xs)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <Button type="button" variant="secondary" onClick={onClose} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!canSubmit}
                isLoading={selectedRecipe ? createRecipeEntryMutation.isPending : createMealMutation.isPending}
                style={{ flex: 2 }}
              >
                {selectedRecipe ? 'Add recipe to intake' : `Log Meal (${stagedItems.length} ${stagedItems.length === 1 ? 'item' : 'items'})`}
              </Button>
            </div>

            {!canSubmit && stagedItems.length > 0 && (
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
                {stagedItems.some((i) => i.isLoadingDetails)
                  ? 'Loading portion options...'
                  : stagedItems.some((i) => i.fetchError)
                  ? 'Please resolve item errors before submitting.'
                  : 'Please ensure each item has a valid portion and quantity.'}
              </p>
            )}
          </div>
        </form>
      </Modal>

      {/* Pre-Meal Compatibility Modal */}
      {evaluatingItem && (
        <FoodEvaluationModal
          isOpen={!!evaluatingItem}
          onClose={() => setEvaluatingItem(null)}
          food={evaluatingItem.food}
          selectedServing={evaluatingItem.serving}
          quantity={evaluatingItem.quantity}
        />
      )}
      {evaluatingRecipe && (
        <FoodEvaluationModal
          isOpen={!!evaluatingRecipe}
          onClose={() => setEvaluatingRecipe(null)}
          food={null}
          selectedServing={null}
          quantity={recipeServings}
          recipe={evaluatingRecipe}
        />
      )}
    </>
  );
};
