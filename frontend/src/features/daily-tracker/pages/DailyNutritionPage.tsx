import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, isToday, parseISO, subDays } from 'date-fns';
import { Apple, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { NutritionContextLinks } from '@/components/layout/NutritionContextLinks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Select } from '@/components/ui/Select';
import { useFoods } from '@/features/foods/hooks/useFoods';
import { foodsApi } from '@/features/foods/api/foodsApi';
import type { FoodDetail } from '@/features/foods/types/foods.types';
import { formatServingLabel, preferredServing } from '@/features/foods/utils/serving';
import { useRecipes } from '@/features/recipes/hooks/useRecipes';
import type { Recipe } from '@/features/recipes/types/recipe.types';
import { recipeMatchesQuery } from '@/features/recipes/recipeSearch';
import { DailyNutritionProgressCard } from '../components/DailyNutritionProgressCard';
import {
  useCreateDailyNutritionEntryMutation,
  useDailyTracker,
  useDeleteDailyNutritionEntryMutation,
  useUpdateDailyNutritionEntryMutation,
} from '../hooks/useDailyTracker';

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

export const DailyNutritionPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodDetail | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedServingId, setSelectedServingId] = useState('');
  const [servings, setServings] = useState('1.00');
  const [isLoadingFood, setIsLoadingFood] = useState(false);
  const [foodError, setFoodError] = useState<string | null>(null);

  const tracker = useDailyTracker(selectedDate);
  const foods = useFoods({ search: search || undefined, limit: 10 });
  const recipes = useRecipes();
  const createEntry = useCreateDailyNutritionEntryMutation(() => {
    setSelectedFood(null);
    setSelectedRecipe(null);
    setSelectedServingId('');
    setServings('1.00');
    setSearch('');
    setIsAddOpen(false);
  });
  const updateEntry = useUpdateDailyNutritionEntryMutation();
  const deleteEntry = useDeleteDailyNutritionEntryMutation();

  const dateObject = parseISO(selectedDate);
  const dateLabel = format(dateObject, 'EEEE, MMMM d');
  const recentFoods = useMemo(() => {
    const seen = new Set<string>();
    return (tracker.data?.entries ?? []).filter((entry) => {
      if (entry.foodId == null) return false;
      if (seen.has(entry.foodId)) return false;
      seen.add(entry.foodId);
      return true;
    }).slice(0, 6);
  }, [tracker.data?.entries]);
  const recipeResults = useMemo(() => {
    return (recipes.data ?? []).filter((recipe) => recipeMatchesQuery(recipe, search));
  }, [recipes.data, search]);

  const chooseFood = async (foodId: string) => {
    setIsLoadingFood(true);
    setFoodError(null);
    try {
      const detail = await foodsApi.getFoodById(foodId);
      const serving = preferredServing(detail.servings) ?? detail.servings[0];
      setSelectedFood(detail);
      setSelectedServingId(serving?.id ?? '');
      setServings('1.00');
      setSearch('');
    } catch (error) {
      setFoodError(error instanceof Error ? error.message : 'Could not load this food.');
    } finally {
      setIsLoadingFood(false);
    }
  };

  const resetAdd = () => {
    setIsAddOpen(false);
    setSearch('');
    setSelectedFood(null);
    setSelectedRecipe(null);
    setSelectedServingId('');
    setFoodError(null);
  };

  const submitEntry = (event: React.FormEvent) => {
    event.preventDefault();
    if (Number.parseFloat(servings) <= 0) return;
    if (selectedRecipe) {
      const version = selectedRecipe.versions[0];
      if (!version) return;
      createEntry.mutate({ date: selectedDate, recipeId: selectedRecipe.id, recipeVersionId: version.id, servings });
      return;
    }
    if (!selectedFood || !selectedServingId) return;
    createEntry.mutate({ date: selectedDate, foodId: selectedFood.id, servingId: selectedServingId, servings });
  };

  const chooseRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setSelectedFood(null);
    setSelectedServingId('');
    setServings('1.00');
    setFoodError(null);
    setSearch('');
  };

  const moveDate = (days: number) => setSelectedDate(format(days < 0 ? subDays(dateObject, 1) : addDays(dateObject, 1), 'yyyy-MM-dd'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader
        title="Daily Nutrition"
        subtitle="Track what you eat and compare your intake with your recorded nutrition targets."
        action={<Button variant="primary" onClick={() => setIsAddOpen((open) => !open)} leftIcon={<Plus size={18} />}>{isAddOpen ? 'Close' : 'Log food or recipe'}</Button>}
      />
      <NutritionContextLinks />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button type="button" onClick={() => moveDate(-1)} aria-label="Previous day" style={{ border: '1px solid var(--border-light)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', width: 40, height: 40, cursor: 'pointer' }}><ChevronLeft size={18} /></button>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 750, textTransform: 'uppercase' }}>{isToday(dateObject) ? 'Today' : 'Daily log'}</span>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{dateLabel}</h1>
        </div>
        <button type="button" onClick={() => moveDate(1)} aria-label="Next day" style={{ border: '1px solid var(--border-light)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', width: 40, height: 40, cursor: 'pointer' }}><ChevronRight size={18} /></button>
      </div>

      {isAddOpen && <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 750 }}>Add food to {isToday(dateObject) ? 'today' : dateLabel}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>Choose a food or saved recipe, then select the portion you ate.</p>
          </div>
          {!selectedFood && !selectedRecipe && <>
            <Input label="Search foods or saved recipes" placeholder="Search rice, chicken, banana..." value={search} onChange={(event) => setSearch(event.target.value)} leftIcon={<Search size={16} />} autoFocus />
            {search && (foods.isLoading || recipes.isLoading || (foods.data?.items.length ?? 0) > 0 || recipeResults.length > 0) && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(foods.isLoading || recipes.isLoading) && <LoadingSpinner label="Searching foods and recipes..." size={18} />}
              {!foods.isLoading && (foods.data?.items.length ?? 0) > 0 && <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Catalog foods</p>}
              {!foods.isLoading && foods.data?.items.map((food) => <button key={food.id} type="button" onClick={() => void chooseFood(food.id)} style={{ textAlign: 'left', border: '1px solid var(--border-light)', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', padding: '10px 12px', cursor: 'pointer' }}><strong>{food.displayName ?? food.name}</strong>{food.variantLabel && <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>{food.variantLabel}</small>}{food.description && <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>{food.description}</small>}</button>)}
            </div>}
            {search && recipeResults.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}><p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Saved recipes</p>{recipeResults.map((recipe) => { const version = recipe.versions[0]; return <button key={recipe.id} type="button" onClick={() => chooseRecipe(recipe)} style={{ textAlign: 'left', border: '1px solid var(--border-light)', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', padding: '10px 12px', cursor: 'pointer' }}><strong>{version?.name ?? 'Untitled recipe'}</strong><small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>{recipeResultDetails(recipe)}</small></button>; })}</div>}
            {search && !foods.isLoading && !recipes.isLoading && foods.data?.items.length === 0 && recipeResults.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No foods or recipes found. Try another search term.</p>}
            {recentFoods.length > 0 && <div><p style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>Recent foods</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{recentFoods.map((food) => <Button key={food.foodId ?? food.id} type="button" size="sm" variant="secondary" onClick={() => food.foodId == null ? undefined : void chooseFood(food.foodId)}>{food.displayName}</Button>)}</div></div>}
          </>}
          {isLoadingFood && <LoadingSpinner label="Loading serving options..." size={18} />}
          {selectedFood && !isLoadingFood && <form onSubmit={submitEntry} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><strong>{selectedFood.displayName ?? selectedFood.name}</strong>{selectedFood.variantLabel && <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>{selectedFood.variantLabel}</small>}</div>
            {selectedFood.servings.length > 0 ? <Select label="Serving" value={selectedServingId} onChange={(event) => setSelectedServingId(event.target.value)} options={selectedFood.servings.map((serving) => ({ value: serving.id, label: formatServingLabel(serving) }))} /> : <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem' }}>This food has no usable serving record.</p>}
            <div><label style={{ fontSize: '0.875rem', fontWeight: 650, display: 'block', marginBottom: 6 }}>Number of servings</label><QuantityStepper value={servings} onChange={setServings} min={0.25} step={0.25} readOnly={false} /></div>
            {foodError && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem' }}>{foodError}</p>}
            <div style={{ display: 'flex', gap: 8 }}><Button type="button" variant="secondary" onClick={resetAdd}>Choose another</Button><Button type="submit" variant="primary" isLoading={createEntry.isPending} disabled={!selectedServingId}>Add to intake</Button></div>
          </form>}
          {selectedRecipe && !isLoadingFood && <form onSubmit={submitEntry} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><strong>{selectedRecipe.versions[0]?.name ?? 'Untitled recipe'}</strong><small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 3 }}>Recipe · Makes {selectedRecipe.versions[0]?.yieldServings ?? '—'} servings</small></div>
            <div><label style={{ fontSize: '0.875rem', fontWeight: 650, display: 'block', marginBottom: 6 }}>How many servings did you eat?</label><p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '0 0 6px' }}>Your recipe stays unchanged; this only records the portion you ate.</p><QuantityStepper value={servings} onChange={setServings} min={0.25} step={0.25} readOnly={false} unitLabel="serving(s)" /></div>
            {foodError && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem' }}>{foodError}</p>}
            <div style={{ display: 'flex', gap: 8 }}><Button type="button" variant="secondary" onClick={resetAdd}>Choose another</Button><Button type="submit" variant="primary" isLoading={createEntry.isPending}>Add recipe to intake</Button></div>
          </form>}
        </div>
      </Card>}

      {tracker.isLoading ? <LoadingSpinner label="Loading your daily intake..." /> : tracker.isError ? <EmptyState icon={<UtensilsCrossed size={32} />} title="Could not load your daily intake" description={tracker.error.message} actionLabel="Try again" onAction={() => void tracker.refetch()} /> : tracker.data && <>
        <DailyNutritionProgressCard totals={tracker.data.totals} targets={tracker.data.targets} />
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UtensilsCrossed size={18} color="var(--color-primary)" /><h2 style={{ fontSize: '1.1rem', fontWeight: 750 }}>Today’s intake</h2></div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{tracker.data.entries.length} {tracker.data.entries.length === 1 ? 'entry' : 'entries'}</span></div>
          {tracker.data.entries.length === 0 ? <div style={{ textAlign: 'center', padding: 'var(--space-lg)', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><Apple size={28} color="var(--text-muted)" /><p style={{ color: 'var(--text-secondary)', margin: '8px 0 12px' }}>Nothing logged for this date yet.</p><Button size="sm" variant="secondary" onClick={() => setIsAddOpen(true)} leftIcon={<Plus size={15} />}>Add your first food</Button></div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{tracker.data.entries.map((entry) => <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><div style={{ minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.displayName}</strong>{entry.variantLabel && <small style={{ color: 'var(--text-muted)' }}>{entry.variantLabel}</small>}<span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>{entry.servingName} · {entry.servingGrams} g</span></div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><QuantityStepper value={entry.servings} onChange={(value) => updateEntry.mutate({ id: entry.id, data: { servings: value } })} min={0.25} step={0.25} /><button type="button" title="Remove entry" aria-label={`Remove ${entry.displayName}`} onClick={() => deleteEntry.mutate(entry.id)} style={{ border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer', padding: 6 }}><Trash2 size={16} /></button></div></div>)}</div>}
        </Card>
        <Card><h2 style={{ fontSize: '1rem', fontWeight: 750 }}>About your totals</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.45, marginTop: 6 }}>Daily totals use the selected canonical food and serving records. A missing target is shown as “Target not configured”; no limit is inferred.</p><Link to="/nutrition-targets" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 700, marginTop: 10 }}><Pencil size={14} /> Manage nutrition targets</Link></Card>
      </>}
    </div>
  );
};
