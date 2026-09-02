import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Pencil, Plus, Save, Search, Trash2, UtensilsCrossed } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Select } from '@/components/ui/Select';
import { useFoods } from '@/features/foods/hooks/useFoods';
import { foodsApi } from '@/features/foods/api/foodsApi';
import { formatServingLabel, preferredServing } from '@/features/foods/utils/serving';
import { recipesApi } from '../api/recipesApi';
import { useDeleteRecipe, useRecipeEvaluation, useRecipeNutrition, useRecipes, useSaveRecipe, useToggleRecipeFavorite } from '../hooks/useRecipes';
import type { Recipe, RecipeIngredientRequest, RecipeRequest } from '../types/recipe.types';

interface ServingOption { id: string; name: string; grams: string; }
interface DraftIngredient extends RecipeIngredientRequest {
  foodName: string;
  foodVariantLabel: string | null;
  servingName: string;
  servingGrams: string;
  servingOptions: ServingOption[];
}
interface InsightView { title?: string; message?: string; }

export const RecipesPage: React.FC = () => {
  const recipes = useRecipes();
  const saveRecipe = useSaveRecipe();
  const deleteRecipe = useDeleteRecipe();
  const toggleFavorite = useToggleRecipeFavorite();
  const evaluateRecipe = useRecipeEvaluation();
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
  const foodResults = useFoods({ search: foodSearch || undefined, limit: 8 });
  const nutrition = useRecipeNutrition(selectedId);
  const selected = recipes.data?.find((recipe) => recipe.id === selectedId);
  const selectedVersion = selected?.versions[0];
  const evaluation = evaluateRecipe.data;
  const evaluationIsPartial = evaluation != null && (evaluation.evaluation.coverage < 100 || evaluation.evaluation.deferredPolicies.length > 0);

  const resetBuilder = () => {
    setEditingId(undefined); setName(''); setDescription(''); setYieldServings('2');
    setInstructions(''); setIngredients([]); setFoodSearch(''); setDuplicateRecipe(null); setAllowDuplicateName(false);
  };

  const editRecipe = (recipe: Recipe) => {
    const version = recipe.versions[0];
    if (!version) return;
    setEditingId(recipe.id); setSelectedId(recipe.id); setName(version.name);
    setDescription(version.description ?? ''); setYieldServings(version.yieldServings);
    setInstructions(version.preparationInstructions ?? ''); setEatenServings('1');
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
        ? [] : [{ id: component.servingId, name: component.servingName, grams: component.servingGrams }],
    })));
  };

  const selectFood = async (foodId: string) => {
    const food = await foodsApi.getFoodById(foodId);
    const serving = preferredServing(food.servings) ?? food.servings[0];
    if (!serving) return;
    setIngredients((current) => [...current, {
      foodId: food.id, servingId: serving.id, quantity: '1', unit: 'SERVING', role: 'INGREDIENT',
      foodName: food.displayName ?? food.name, foodVariantLabel: food.variantLabel ?? null,
      servingName: serving.name, servingGrams: serving.grams,
      servingOptions: food.servings.map((item) => ({ id: item.id, name: item.name, grams: item.grams })),
    }]);
    setFoodSearch('');
  };

  const request = useMemo<RecipeRequest>(() => ({
    name: name.trim(), description: description.trim(), servings: yieldServings,
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

  const renderEvaluation = () => {
    if (!evaluation) return null;
    const insights = (evaluation.evaluation.nutritionInsights ?? []).filter((item): item is InsightView => typeof item === 'object' && item != null);
    return <section aria-label="Recipe evaluation" style={{ marginTop: 16, padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: evaluationIsPartial ? 'var(--bg-surface-secondary)' : 'var(--color-primary-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}><div><h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Recipe Compatibility</h3><p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>{evaluationIsPartial ? 'This compatibility check is incomplete.' : 'This result uses the nutrition guidance currently available for your profile.'}</p></div><div style={{ textAlign: 'right' }}><small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{evaluationIsPartial ? 'Supporting score' : 'Score'}</small><strong style={{ display: 'block', fontSize: evaluationIsPartial ? '1.25rem' : '1.8rem', lineHeight: 1.1 }}>{evaluation.evaluation.score}/100</strong></div></div>
      {evaluationIsPartial && <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 10 }}>Some clinically relevant nutrition guidance could not be evaluated for this profile. The score reflects only the guidance that could be checked.</p>}
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 8 }}>Coverage status: {evaluationIsPartial ? 'Partial' : 'Complete'} · Eaten amount: {eatenServings} serving{eatenServings === '1' ? '' : 's'}</p>
      {insights.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}><strong style={{ fontSize: '0.82rem' }}>Nutrition insights</strong>{insights.map((insight, index) => <p key={`${insight.title ?? 'insight'}-${index}`} style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{insight.title ? `${insight.title}: ` : ''}{insight.message ?? ''}</p>)}</div>}
      {evaluation.evaluation.reasons.length > 0 && <div style={{ marginTop: 12 }}><strong style={{ fontSize: '0.82rem' }}>Why this result</strong><ul style={{ margin: '6px 0 0 18px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{evaluation.evaluation.reasons.slice(0, 5).map((reason, index) => <li key={index}>{formatEvaluationItem(reason)}</li>)}</ul></div>}
    </section>;
  };

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
    <PageHeader title="My Recipes" subtitle="Build recipes from canonical foods. Nutrition and evaluation always come from the existing engine." action={<Button variant="primary" onClick={resetBuilder} leftIcon={<Plus size={17} />}>New recipe</Button>} />
    {recipes.isLoading ? <LoadingSpinner label="Loading your recipes..." /> : recipes.isError ? <EmptyState icon={<UtensilsCrossed size={32} />} title="Could not load recipes" description={recipes.error.message} /> : <>
      <Card><h2 style={{ fontSize: '1.05rem', fontWeight: 750 }}>Recipe builder</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>Choose an ingredient, select a familiar canonical serving when available, and set how many of that serving the recipe uses.</p><form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
        <Input label="Recipe name" placeholder="Chicken Adobo" value={name} onChange={(event) => { setName(event.target.value); setDuplicateRecipe(null); setAllowDuplicateName(false); }} required />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}><Input label="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} /><div><Input label="How much does this recipe make?" type="number" min="0.01" step="0.01" value={yieldServings} onChange={(event) => setYieldServings(event.target.value)} required /><p style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', lineHeight: 1.35, marginTop: 5 }}>The complete recipe will make approximately this many servings. You can choose how many servings you eat later.</p></div></div>
        <Input label="Preparation instructions (optional)" value={instructions} onChange={(event) => setInstructions(event.target.value)} />
        <div><Input label="Add ingredients" placeholder="Search chicken, rice, vinegar..." value={foodSearch} onChange={(event) => setFoodSearch(event.target.value)} leftIcon={<Search size={16} />} />{foodSearch && <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>{foodResults.data?.items.map((food) => <button key={food.id} type="button" onClick={() => void selectFood(food.id)} style={pickerStyle}><strong>{food.displayName ?? food.name}</strong>{food.variantLabel && <small style={mutedBlockStyle}>{food.variantLabel}</small>}{food.displayName && food.name !== food.displayName && <small style={mutedBlockStyle}>Catalog detail: {food.name}</small>}<small style={mutedBlockStyle}>Canonical catalog food</small></button>)}</div>}</div>
        {ingredients.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><strong style={{ fontSize: '0.85rem' }}>Ingredients</strong>{ingredients.map((ingredient, index) => <div key={`${ingredient.foodId}-${index}`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10, padding: 10, background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}><div style={{ minWidth: 160, flex: 1 }}><strong style={{ display: 'block' }}>{ingredient.foodName}</strong>{ingredient.foodVariantLabel && <small style={mutedBlockStyle}>{ingredient.foodVariantLabel}</small>}<small style={mutedBlockStyle}>Choose the serving first, then set its quantity.</small></div>{ingredient.servingOptions.length > 0 ? <div style={{ minWidth: 180, flex: 1 }}><Select label="Serving or household measure" value={ingredient.servingId ?? ''} onChange={(event) => { const serving = ingredient.servingOptions.find((item) => item.id === event.target.value); if (!serving) return; setIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, servingId: serving.id, servingName: serving.name, servingGrams: serving.grams } : item)); }} options={ingredient.servingOptions.map((item) => ({ value: item.id, label: formatServingLabel(item) }))} /></div> : <small style={{ color: 'var(--text-muted)' }}>{formatServingLabel({ name: ingredient.servingName, grams: ingredient.servingGrams })}</small>}<div style={{ minWidth: 132 }}><label style={labelStyle}>Quantity</label><QuantityStepper value={ingredient.quantity} onChange={(value) => setIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: value } : item))} unitLabel="×" /></div><button type="button" aria-label={`Remove ${ingredient.foodName}`} onClick={() => setIngredients((current) => current.filter((_item, itemIndex) => itemIndex !== index))} style={removeButtonStyle}><Trash2 size={16} /></button></div>)}</div>}
        {duplicateRecipe && <div role="alert" style={{ padding: 12, border: '1px solid var(--color-warning)', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}><strong>You already have a recipe named {duplicateRecipe.versions[0]?.name ?? request.name}.</strong><p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>Would you like to edit it, or create another recipe with the same name?</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 9 }}><Button type="button" size="sm" variant="secondary" onClick={() => { editRecipe(duplicateRecipe); setDuplicateRecipe(null); }}>Edit existing recipe</Button><Button type="button" size="sm" variant="secondary" onClick={() => { setAllowDuplicateName(true); setDuplicateRecipe(null); }}>Create another recipe</Button></div></div>}
        <div style={{ display: 'flex', gap: 8 }}><Button type="submit" variant="primary" isLoading={saveRecipe.isPending} disabled={!name.trim() || ingredients.length === 0} leftIcon={<Save size={16} />}>{editingId ? 'Save new version' : 'Save recipe'}</Button>{editingId && <Button type="button" variant="secondary" onClick={resetBuilder}>Cancel</Button>}</div>
      </form></Card>
      <Card><h2 style={{ fontSize: '1.05rem', fontWeight: 750 }}>Saved recipes</h2>{(recipes.data?.length ?? 0) === 0 ? <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>You have not saved a recipe yet.</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10, marginTop: 'var(--space-md)' }}>{recipes.data?.map((recipe) => { const version = recipe.versions[0]; return <div key={recipe.id} style={{ textAlign: 'left', border: selectedId === recipe.id ? '2px solid var(--color-primary)' : '1px solid var(--border-light)', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', padding: 13 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><button type="button" onClick={() => setSelectedId(recipe.id)} style={titleButtonStyle}><strong>{version?.name ?? 'Untitled recipe'}</strong></button><button type="button" aria-label={recipe.isFavorite ? `Remove ${version?.name ?? 'recipe'} from favorites` : `Favorite ${version?.name ?? 'recipe'}`} onClick={() => toggleFavorite.mutate({ id: recipe.id, isFavorite: !recipe.isFavorite })} style={favoriteButtonStyle}><Heart size={15} fill={recipe.isFavorite ? 'currentColor' : 'none'} /></button></div><button type="button" onClick={() => setSelectedId(recipe.id)} style={subtleButtonStyle}>{version?.components.length ?? 0} ingredients · Makes {version?.yieldServings ?? '—'} servings</button></div>; })}</div>}</Card>
      {selected && selectedVersion && <Card><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}><div><h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{selectedVersion.name}</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>{selectedVersion.description ?? 'Recipe made from canonical food records.'}</p><p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 5 }}><strong>Makes:</strong> {selectedVersion.yieldServings} servings</p></div><div style={{ display: 'flex', gap: 7 }}><Button size="sm" variant="secondary" onClick={() => editRecipe(selected)} leftIcon={<Pencil size={14} />}>Edit</Button><Button size="sm" variant="secondary" onClick={() => { if (window.confirm('Delete this recipe?')) deleteRecipe.mutate(selected.id); }} leftIcon={<Trash2 size={14} />}>Delete</Button></div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}><strong style={{ fontSize: '0.85rem' }}>Ingredients</strong>{selectedVersion.components.map((component) => <div key={component.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, color: 'var(--text-secondary)', fontSize: '0.82rem' }}><span><strong style={{ color: 'var(--text-primary)' }}>{component.foodDisplayName}</strong>{component.foodVariantLabel && <small style={mutedBlockStyle}>{component.foodVariantLabel}</small>}</span><span style={{ textAlign: 'right' }}>{component.quantity} × {component.unit === 'GRAM' ? `${component.servingGrams ?? '0'} g` : formatServingLabel({ name: component.servingName ?? 'serving', grams: component.servingGrams ?? '100' })}</span></div>)}</div>
        {nutrition.isLoading ? <LoadingSpinner label="Calculating canonical nutrition..." size={18} /> : nutrition.data && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 14 }}>{nutrition.data.nutrients.slice(0, 8).map((item) => <div key={`${item.name}-${item.unit}`} style={{ padding: 9, borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-secondary)' }}><small style={{ color: 'var(--text-muted)' }}>{item.name}</small><strong style={{ display: 'block', marginTop: 3 }}>{item.amount} {item.unit}</strong></div>)}</div>}
        <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}><label style={labelStyle}>How much are you eating?</label><p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '4px 0 8px' }}>Choose the portion of this recipe you are evaluating or adding today.</p><QuantityStepper value={eatenServings} onChange={setEatenServings} min={0.25} step={0.25} unitLabel="serving(s)" /></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}><Button size="sm" variant="primary" onClick={() => evaluateRecipe.mutate({ id: selected.id, servings: eatenServings, version: selectedVersion.version })} isLoading={evaluateRecipe.isPending}>Evaluate recipe</Button><Button size="sm" variant="secondary" onClick={() => void addRecipe(selected)} leftIcon={<Plus size={14} />}>Add to today&apos;s intake</Button><Link to="/food-evaluation" style={{ textDecoration: 'none' }}><Button size="sm" variant="secondary">Food evaluation</Button></Link></div>
        {renderEvaluation()}
      </Card>}
    </>}
  </div>;
};

function formatEvaluationItem(value: unknown): string {
  if (typeof value !== 'object' || value == null) return String(value);
  const item = value as { explanation?: unknown; nutrient?: unknown; direction?: unknown };
  if (typeof item.explanation === 'string') return item.explanation;
  if (typeof item.nutrient === 'string' && typeof item.direction === 'string') return `${item.nutrient}: ${item.direction}`;
  return JSON.stringify(value);
}

const pickerStyle: React.CSSProperties = { textAlign: 'left', padding: '9px 11px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-secondary)', cursor: 'pointer' };
const mutedBlockStyle: React.CSSProperties = { display: 'block', color: 'var(--text-muted)', marginTop: 2 };
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 5 };
const removeButtonStyle: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer', padding: 6 };
const titleButtonStyle: React.CSSProperties = { flex: 1, textAlign: 'left', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' };
const favoriteButtonStyle: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' };
const subtleButtonStyle: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: '5px 0 0', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' };
