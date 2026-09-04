import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Heart,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Select } from '@/components/ui/Select';
import { useFoods } from '@/features/foods/hooks/useFoods';
import { foodsApi } from '@/features/foods/api/foodsApi';
import { formatServingLabel, preferredServing } from '@/features/foods/utils/serving';
import { FoodEvaluationModal } from '@/features/food-evaluation/components/FoodEvaluationModal';
import { recipesApi } from '../api/recipesApi';
import { useDeleteRecipe, useRecipeNutrition, useRecipes, useSaveRecipe, useToggleRecipeFavorite } from '../hooks/useRecipes';
import type { Recipe, RecipeIngredientRequest, RecipeRequest } from '../types/recipe.types';
import './recipes.css';

interface ServingOption {
  id: string;
  name: string;
  grams: string;
}

interface DraftIngredient extends RecipeIngredientRequest {
  foodName: string;
  foodVariantLabel: string | null;
  servingName: string;
  servingGrams: string;
  servingOptions: ServingOption[];
}

const recipeUnitLabel = (ingredient: DraftIngredient) => {
  if (ingredient.unit === 'GRAM' || ingredient.servingOptions.length === 0) {
    return `${ingredient.servingGrams} g`;
  }
  return formatServingLabel({ name: ingredient.servingName, grams: ingredient.servingGrams });
};

const moveIngredient = (items: DraftIngredient[], index: number, offset: number) => {
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
};

const RecipeNutritionPreview: React.FC<{
  recipe: Recipe | undefined;
  version: Recipe['versions'][number] | undefined;
  nutrition: ReturnType<typeof useRecipeNutrition>;
  onEvaluate: () => void;
  onAdd: () => void;
  eatenServings: string;
  setEatenServings: (value: string) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}> = ({ recipe, version, nutrition, onEvaluate, onAdd, eatenServings, setEatenServings, isFavorite, onToggleFavorite }) => {
  if (!recipe || !version) {
    return (
      <Card className="recipe-preview-empty">
        <div className="recipe-preview-empty-icon" aria-hidden="true"><Sparkles size={24} /></div>
        <h2>Nutrition preview</h2>
        <p>Choose a saved recipe to see its nutrition, evaluation, and logging actions here.</p>
      </Card>
    );
  }

  return (
    <Card className="recipe-preview-card" aria-label="Recipe preview">
      <div className="recipe-section-kicker">Nutrition preview</div>
      <div className="recipe-preview-title-row">
        <div>
          <h2>{version.name}</h2>
          <p>Nutrition per serving · Makes {version.yieldServings} servings</p>
        </div>
        <div className="recipe-preview-badges">
          <Badge variant="neutral" size="sm">Version {version.version}</Badge>
          <button type="button" className="recipe-preview-favorite" onClick={onToggleFavorite} aria-label={isFavorite ? `Remove ${version.name} from favorites` : `Favorite ${version.name}`}>
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {nutrition.isLoading ? (
        <div className="recipe-preview-loading"><LoadingSpinner label="Calculating nutrition..." size={20} /></div>
      ) : nutrition.isError ? (
        <p className="recipe-preview-error">Nutrition preview is temporarily unavailable. You can still edit the recipe.</p>
      ) : nutrition.data ? (
        <div className="recipe-nutrition-grid">
          {nutrition.data.nutrients.slice(0, 8).map((item) => (
            <div className="recipe-nutrition-card" key={`${item.name}-${item.unit}`}>
              <span>{item.name}</span>
              <strong>{item.amount} {item.unit}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <div className="recipe-preview-note">
        <strong>Nutrition is calculated from the canonical ingredients.</strong>
        <span>The complete recipe is divided by its serving yield. Changing what you eat later will not change the saved recipe.</span>
      </div>

      <div className="recipe-preview-ingredients" aria-label="Recipe ingredients">
        <div className="recipe-section-kicker">Ingredients</div>
        {version.components.map((component) => (
          <div className="recipe-preview-ingredient" key={component.id}>
            <span>{component.foodDisplayName}{component.foodVariantLabel && <small>{component.foodVariantLabel}</small>}</span>
            <strong>{component.quantity} × {component.unit === 'GRAM' ? `${component.servingGrams ?? '0'} g` : formatServingLabel({ name: component.servingName ?? 'serving', grams: component.servingGrams ?? '100' })}</strong>
          </div>
        ))}
      </div>

      <div className="recipe-eating-card">
        <div>
          <div className="recipe-section-kicker">Log a portion</div>
          <h3>How many servings are you eating?</h3>
          <p>Choose today&apos;s amount. The saved recipe stays unchanged.</p>
        </div>
        <QuantityStepper value={eatenServings} onChange={setEatenServings} min={0.25} step={0.25} unitLabel="serving(s)" readOnly={false} />
      </div>

      <div className="recipe-preview-actions">
        <Button type="button" variant="primary" onClick={onEvaluate} leftIcon={<Sparkles size={15} />}>Evaluate recipe</Button>
        <Button type="button" variant="secondary" onClick={onAdd} leftIcon={<Plus size={15} />}>Add to today&apos;s intake</Button>
      </div>
    </Card>
  );
};

export const RecipesPage: React.FC = () => {
  const recipes = useRecipes();
  const saveRecipe = useSaveRecipe();
  const deleteRecipe = useDeleteRecipe();
  const toggleFavorite = useToggleRecipeFavorite();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [editingId, setEditingId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [yieldServings, setYieldServings] = useState('2');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);
  const [foodSearch, setFoodSearch] = useState('');
  const [eatenServings, setEatenServings] = useState('1');
  const [duplicateRecipe, setDuplicateRecipe] = useState<Recipe | null>(null);
  const [allowDuplicateName, setAllowDuplicateName] = useState(false);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const foodResults = useFoods({ search: foodSearch || undefined, limit: 8 });
  const nutrition = useRecipeNutrition(selectedId);
  const selected = recipes.data?.find((recipe) => recipe.id === selectedId);
  const selectedVersion = selected?.versions[0];

  const resetBuilder = () => {
    setEditingId(undefined);
    setName('');
    setDescription('');
    setYieldServings('2');
    setInstructions('');
    setIngredients([]);
    setFoodSearch('');
    setDuplicateRecipe(null);
    setAllowDuplicateName(false);
  };

  const editRecipe = (recipe: Recipe) => {
    const version = recipe.versions[0];
    if (!version) return;
    setEditingId(recipe.id);
    setSelectedId(recipe.id);
    setName(version.name);
    setDescription(version.description ?? '');
    setYieldServings(version.yieldServings);
    setInstructions(version.preparationInstructions ?? '');
    setEatenServings('1');
    setIngredients(version.components.map((component) => ({
      foodId: component.foodId,
      servingId: component.servingId ?? undefined,
      quantity: component.quantity,
      unit: component.unit,
      role: component.role,
      notes: component.notes ?? undefined,
      foodName: component.foodDisplayName,
      foodVariantLabel: component.foodVariantLabel,
      servingName: component.servingName ?? 'Gram amount',
      servingGrams: component.servingGrams ?? '0',
      servingOptions: component.servingId == null || component.servingName == null || component.servingGrams == null
        ? []
        : [{ id: component.servingId, name: component.servingName, grams: component.servingGrams }],
    })));
  };

  const selectFood = async (foodId: string) => {
    const food = await foodsApi.getFoodById(foodId);
    const serving = preferredServing(food.servings) ?? food.servings[0];
    if (!serving) return;
    setIngredients((current) => [...current, {
      foodId: food.id,
      servingId: serving.id,
      quantity: '1',
      unit: 'SERVING',
      role: 'INGREDIENT',
      foodName: food.displayName ?? food.name,
      foodVariantLabel: food.variantLabel ?? null,
      servingName: serving.name,
      servingGrams: serving.grams,
      servingOptions: food.servings.map((item) => ({ id: item.id, name: item.name, grams: item.grams })),
    }]);
    setFoodSearch('');
  };

  const updateIngredient = (index: number, update: Partial<DraftIngredient>) => {
    setIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
  };

  const duplicateIngredient = (index: number) => {
    setIngredients((current) => {
      const ingredient = current[index];
      if (!ingredient) return current;
      return [...current.slice(0, index + 1), { ...ingredient }, ...current.slice(index + 1)];
    });
  };

  const request = useMemo<RecipeRequest>(() => ({
    name: name.trim(),
    description: description.trim(),
    servings: yieldServings,
    preparationInstructions: instructions.trim(),
    ingredients: ingredients.map(({ foodName: _foodName, foodVariantLabel: _variant, servingName: _serving, servingGrams: _grams, servingOptions: _options, ...ingredient }) => ingredient),
  }), [description, ingredients, instructions, name, yieldServings]);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!request.name || ingredients.length === 0) return;
    const duplicate = recipes.data?.find((recipe) => {
      const currentVersion = recipe.versions[0];
      return recipe.id !== editingId && currentVersion?.name.trim().toLocaleLowerCase() === request.name.toLocaleLowerCase();
    });
    if (duplicate && !allowDuplicateName) {
      setDuplicateRecipe(duplicate);
      return;
    }
    saveRecipe.mutate({ id: editingId, data: request });
  };

  const addRecipe = async (recipe: Recipe) => {
    const version = recipe.versions[0];
    if (!version) return;
    await recipesApi.addToDailyTracker(recipe.id, { servings: eatenServings, version: version.version });
  };

  return (
    <div className="recipes-page">
      <PageHeader
        title="My Recipes"
        subtitle="Build meals from trusted food records. Nutrition and evaluation use the same guidance as the rest of NutriApp."
        action={<Button variant="primary" onClick={resetBuilder} leftIcon={<Plus size={17} />}>New recipe</Button>}
      />

      {recipes.isLoading ? <LoadingSpinner label="Loading your recipes..." /> : recipes.isError ? (
        <EmptyState icon={<UtensilsCrossed size={32} />} title="Could not load recipes" description={recipes.error.message} />
      ) : (
        <>
          <div className="recipe-workspace">
            <main>
              <Card className="recipe-builder-card">
                <div className="recipe-builder-header">
                  <div>
                    <div className="recipe-section-kicker">{editingId ? 'Edit recipe' : 'Create a recipe'}</div>
                    <h2>{editingId ? 'Update your recipe' : 'Build it step by step'}</h2>
                    <p>Choose ingredients, tell us how many servings the recipe makes, and we&apos;ll handle the nutrition details.</p>
                  </div>
                  {editingId && <Badge variant="neutral" size="sm">Current recipe</Badge>}
                </div>

                <div className="recipe-stepper" aria-label="Recipe creation steps">
                  {['Details', 'Ingredients', 'Yield', 'Preview'].map((step, index) => (
                    <div className={`recipe-step ${index === 0 ? 'is-active' : ''}`} key={step}>
                      <span>{index + 1}</span>{step}
                    </div>
                  ))}
                </div>

                <form onSubmit={save} className="recipe-builder-form">
                  <section className="recipe-builder-section" aria-labelledby="recipe-details-heading">
                    <div className="recipe-section-heading">
                      <span className="recipe-section-number">1</span>
                      <div><h3 id="recipe-details-heading">Recipe details</h3><p>Give your recipe a name people will recognize.</p></div>
                    </div>
                    <div className="recipe-form-grid">
                      <Input
                        label="Recipe name"
                        placeholder="Chicken Adobo"
                        value={name}
                        onChange={(event) => { setName(event.target.value); setDuplicateRecipe(null); setAllowDuplicateName(false); }}
                        required
                      />
                      <Input label="Description (optional)" placeholder="A simple family recipe" value={description} onChange={(event) => setDescription(event.target.value)} />
                    </div>
                    <Input label="Preparation instructions (optional)" placeholder="Add steps or notes for next time" value={instructions} onChange={(event) => setInstructions(event.target.value)} />
                  </section>

                  <section className="recipe-builder-section" aria-labelledby="recipe-ingredients-heading">
                    <div className="recipe-section-heading">
                      <span className="recipe-section-number">2</span>
                      <div><h3 id="recipe-ingredients-heading">Ingredients</h3><p>Search the catalog and choose the serving that matches what you use.</p></div>
                    </div>
                    <div className="recipe-search-wrap">
                      <Input label="Add ingredients" placeholder="Search chicken, rice, vinegar..." value={foodSearch} onChange={(event) => setFoodSearch(event.target.value)} leftIcon={<Search size={16} />} />
                      {foodSearch && (
                        <div className="recipe-food-results" role="listbox" aria-label="Ingredient search results">
                          {foodResults.isLoading && <div className="recipe-search-status">Searching the food catalog...</div>}
                          {!foodResults.isLoading && foodResults.data?.items.length === 0 && <div className="recipe-search-status">No ingredients found. Try another search.</div>}
                          {foodResults.data?.items.map((food) => {
                            const title = food.displayName ?? food.name;
                            return (
                              <button
                                key={food.id}
                                type="button"
                                aria-label={`Add ${title}${food.variantLabel ? `, ${food.variantLabel}` : ''} Catalog food`}
                                onClick={() => void selectFood(food.id)}
                                className="recipe-food-result"
                              >
                                <span className="recipe-food-result-main"><strong>{title}</strong><Badge variant="neutral" size="sm">Catalog food</Badge></span>
                                {food.variantLabel && <small>{food.variantLabel}</small>}
                                {food.description && <small>{food.description}</small>}
                                <span className="recipe-food-result-action">Add ingredient <Plus size={14} aria-hidden="true" /></span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {ingredients.length === 0 ? (
                      <div className="recipe-ingredients-empty"><UtensilsCrossed size={20} aria-hidden="true" /><span>Add ingredients one by one. You can adjust the quantity and serving after each selection.</span></div>
                    ) : (
                      <div className="recipe-ingredients-list">
                        <div className="recipe-list-heading"><strong>{ingredients.length} ingredient{ingredients.length === 1 ? '' : 's'}</strong><span>Quantity · serving · ingredient</span></div>
                        {ingredients.map((ingredient, index) => (
                          <div className="recipe-ingredient-row" key={`${ingredient.foodId}-${index}`}>
                            <div className="recipe-ingredient-identity">
                              <span className="recipe-ingredient-order" aria-label={`Ingredient ${index + 1}`}>{index + 1}</span>
                              <div><strong>{ingredient.foodName}</strong>{ingredient.foodVariantLabel && <small>{ingredient.foodVariantLabel}</small>}<span className="recipe-canonical-label">Catalog ingredient</span></div>
                            </div>
                            <div className="recipe-ingredient-controls">
                              {ingredient.servingOptions.length > 0 ? (
                                <Select
                                  label="Serving unit"
                                  value={ingredient.servingId ?? ''}
                                  onChange={(event) => {
                                    const serving = ingredient.servingOptions.find((item) => item.id === event.target.value);
                                    if (serving) updateIngredient(index, { servingId: serving.id, servingName: serving.name, servingGrams: serving.grams, unit: 'SERVING' });
                                  }}
                                  options={ingredient.servingOptions.map((item) => ({ value: item.id, label: formatServingLabel(item) }))}
                                />
                              ) : (
                                <div className="recipe-gram-serving"><span>Serving unit</span><strong>{ingredient.servingGrams} g serving</strong><small>No household measure is available for this item.</small></div>
                              )}
                              <div className="recipe-quantity-control">
                                <label>Quantity</label>
                                <QuantityStepper value={ingredient.quantity} onChange={(value) => updateIngredient(index, { quantity: value })} unitLabel="×" readOnly={false} />
                              </div>
                            </div>
                            <div className="recipe-ingredient-summary" aria-label={`${ingredient.quantity} times ${recipeUnitLabel(ingredient)}`}>
                              <strong>{ingredient.quantity} × {recipeUnitLabel(ingredient)}</strong>
                              <span>{ingredient.foodName}</span>
                            </div>
                            <div className="recipe-ingredient-actions">
                              <button type="button" aria-label={`Move ${ingredient.foodName} up`} onClick={() => setIngredients((current) => moveIngredient(current, index, -1))} disabled={index === 0} title="Move up"><ChevronUp size={16} /></button>
                              <button type="button" aria-label={`Move ${ingredient.foodName} down`} onClick={() => setIngredients((current) => moveIngredient(current, index, 1))} disabled={index === ingredients.length - 1} title="Move down"><ChevronDown size={16} /></button>
                              <button type="button" aria-label={`Duplicate ${ingredient.foodName}`} onClick={() => duplicateIngredient(index)} title="Duplicate ingredient"><Copy size={16} /></button>
                              <button type="button" aria-label={`Remove ${ingredient.foodName}`} onClick={() => setIngredients((current) => current.filter((_item, itemIndex) => itemIndex !== index))} title="Remove ingredient"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="recipe-builder-section" aria-labelledby="recipe-yield-heading">
                    <div className="recipe-section-heading">
                      <span className="recipe-section-number">3</span>
                      <div><h3 id="recipe-yield-heading">How many servings does this recipe make?</h3><p>This helps calculate nutrition per serving. You can choose how much you eat later.</p></div>
                    </div>
                    <div className="recipe-yield-options" role="group" aria-label="Quick serving choices">
                      {[1, 2, 4, 6, 8].map((value) => (
                        <button key={value} type="button" className={yieldServings === String(value) ? 'is-selected' : ''} onClick={() => setYieldServings(String(value))}>{value}</button>
                      ))}
                      <span className="recipe-yield-custom">or enter a custom amount</span>
                    </div>
                    <Input label="Servings this recipe makes" type="number" min="0.01" step="0.01" value={yieldServings} onChange={(event) => setYieldServings(event.target.value)} required helperText="The complete recipe is divided by this number when nutrition per serving is calculated." />
                  </section>

                  {duplicateRecipe && (
                    <div className="recipe-duplicate-alert" role="alert">
                      <strong>You already have a recipe named {duplicateRecipe.versions[0]?.name ?? request.name}.</strong>
                      <p>Would you like to edit the existing recipe, or intentionally create another one?</p>
                      <div>
                        <Button type="button" size="sm" variant="secondary" onClick={() => { editRecipe(duplicateRecipe); setDuplicateRecipe(null); }}>Edit existing recipe</Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => { setAllowDuplicateName(true); setDuplicateRecipe(null); }}>Create another recipe</Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => { setDuplicateRecipe(null); setAllowDuplicateName(false); }}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="recipe-save-row">
                    <div><div className="recipe-section-kicker">{editingId ? 'Save a new version' : 'Ready when you are'}</div><p>{editingId ? 'Your previous recipe history remains available.' : 'You can evaluate and log the recipe after saving.'}</p></div>
                    <div>
                      {editingId && <Button type="button" variant="secondary" onClick={resetBuilder}>Cancel</Button>}
                      <Button type="submit" variant="primary" isLoading={saveRecipe.isPending} disabled={!name.trim() || ingredients.length === 0} leftIcon={<Save size={16} />}>{editingId ? 'Save changes' : 'Save recipe'}</Button>
                    </div>
                  </div>
                </form>
              </Card>
            </main>

            <aside className="recipe-preview-column">
              <RecipeNutritionPreview
                recipe={selected}
                version={selectedVersion}
                nutrition={nutrition}
                onEvaluate={() => setIsEvaluationOpen(true)}
                onAdd={() => { if (selected) void addRecipe(selected); }}
                eatenServings={eatenServings}
                setEatenServings={setEatenServings}
                isFavorite={selected?.isFavorite ?? false}
                onToggleFavorite={() => { if (selected) toggleFavorite.mutate({ id: selected.id, isFavorite: !selected.isFavorite }); }}
              />
              {!selected && ingredients.length > 0 && (
                <Card className="recipe-unsaved-preview">
                  <div className="recipe-section-kicker">Step 4 · Nutrition preview</div>
                  <h2>Save to calculate nutrition</h2>
                  <p>NutriApp calculates your recipe from the canonical food records after it is saved. This keeps the same trusted calculation used everywhere else.</p>
                </Card>
              )}
            </aside>
          </div>

          <section className="recipe-library" aria-labelledby="saved-recipes-heading">
            <Card>
              <div className="recipe-library-header">
                <div><div className="recipe-section-kicker">Your collection</div><h2 id="saved-recipes-heading">Saved recipes</h2><p>Open a recipe to view nutrition, evaluate it, or add a portion to today&apos;s intake.</p></div>
                <Badge variant="neutral" size="sm">{recipes.data?.length ?? 0} saved</Badge>
              </div>
              {(recipes.data?.length ?? 0) === 0 ? (
                <EmptyState icon={<UtensilsCrossed size={28} />} title="Create your first recipe" description="Add ingredients one by one, choose how many servings it makes, and NutriApp will calculate nutrition automatically." actionLabel="Start a recipe" onAction={resetBuilder} />
              ) : (
                <div className="recipe-library-grid">
                  {recipes.data?.map((recipe) => {
                    const version = recipe.versions[0];
                    const isSelected = selectedId === recipe.id;
                    return (
                      <article className={`recipe-card ${isSelected ? 'is-selected' : ''}`} key={recipe.id}>
                        <button type="button" className="recipe-card-open" onClick={() => setSelectedId(recipe.id)} aria-label={`Open ${version?.name ?? 'recipe'}`}>
                          <span className="recipe-card-icon" aria-hidden="true"><UtensilsCrossed size={19} /></span>
                          <span className="recipe-card-content"><strong>{version?.name ?? 'Untitled recipe'}</strong><span>{version?.components.length ?? 0} ingredients · Makes {version?.yieldServings ?? '—'} servings</span><small>Updated {format(new Date(recipe.updatedAt), 'MMM d, yyyy')}</small></span>
                        </button>
                        <div className="recipe-card-actions">
                          <button type="button" aria-label={recipe.isFavorite ? `Remove ${version?.name ?? 'recipe'} from favorites` : `Favorite ${version?.name ?? 'recipe'}`} onClick={() => toggleFavorite.mutate({ id: recipe.id, isFavorite: !recipe.isFavorite })} className={recipe.isFavorite ? 'is-favorite' : ''}><Heart size={16} fill={recipe.isFavorite ? 'currentColor' : 'none'} /></button>
                          <Button size="sm" variant="secondary" onClick={() => editRecipe(recipe)} leftIcon={<Pencil size={14} />}>Edit</Button>
                          <button type="button" aria-label={`Delete ${version?.name ?? 'recipe'}`} onClick={() => { if (window.confirm(`Delete ${version?.name ?? 'this recipe'}?`)) deleteRecipe.mutate(recipe.id); }}><Trash2 size={16} /></button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </Card>
          </section>

          {isEvaluationOpen && selected && selectedVersion && (
            <FoodEvaluationModal
              isOpen={isEvaluationOpen}
              onClose={() => setIsEvaluationOpen(false)}
              food={null}
              selectedServing={null}
              quantity={eatenServings}
              recipe={{ id: selected.id, version: selectedVersion.version, name: selectedVersion.name }}
              onAddToMeal={() => { void addRecipe(selected); setIsEvaluationOpen(false); }}
              addActionLabel="Add to today's intake"
            />
          )}
        </>
      )}
    </div>
  );
};
