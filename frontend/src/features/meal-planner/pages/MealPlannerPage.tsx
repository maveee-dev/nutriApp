import React, { useState } from 'react';
import { format, isToday, parseISO, subDays, addDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, ClipboardList, Plus, RefreshCw, UtensilsCrossed } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Select } from '@/components/ui/Select';
import { useCreateDailyNutritionEntryMutation } from '@/features/daily-tracker/hooks/useDailyTracker';
import { recipesApi } from '@/features/recipes/api/recipesApi';
import { useMealPlanner } from '../hooks/useMealPlanner';
import type { MealPlannerFocus, MealPlannerMealType } from '../types/meal-planner.types';

const MEAL_TYPES: { value: MealPlannerMealType; label: string }[] = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'SNACK', label: 'Snack' },
];

const FOCUSES: { value: MealPlannerFocus; label: string }[] = [
  { value: 'BALANCED', label: 'Balanced' },
  { value: 'LOW_SODIUM', label: 'Lower sodium' },
  { value: 'HIGH_PROTEIN', label: 'Higher protein' },
  { value: 'HIGH_FIBER', label: 'Higher fiber' },
  { value: 'CALORIE_BUDGET', label: 'Fit calorie budget' },
];

const nutrientLabels: Record<string, string> = {
  calories: 'Calories',
  protein: 'Protein',
  carbohydrates: 'Carbs',
  fat: 'Fat',
  fiber: 'Fiber',
  sodium: 'Sodium',
  potassium: 'Potassium',
  phosphorus: 'Phosphorus',
  cholesterol: 'Cholesterol',
};

function amount(value: string | null | undefined): string {
  if (value == null) return '—';
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? (parsed >= 100 ? Math.round(parsed).toString() : (Math.round(parsed * 10) / 10).toString()) : value;
}

export const MealPlannerPage: React.FC = () => {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [mealType, setMealType] = useState<MealPlannerMealType>('BREAKFAST');
  const [focus, setFocus] = useState<MealPlannerFocus>('BALANCED');
  const [addingFoodId, setAddingFoodId] = useState<string | null>(null);
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const planner = useMealPlanner({ date, mealType, focus, limit: 5 });
  const createEntry = useCreateDailyNutritionEntryMutation();
  const dateObject = parseISO(date);
  const dateLabel = format(dateObject, 'EEEE, MMMM d');

  const addFood = async (food: NonNullable<typeof planner.data>['foods'][number]) => {
    setAddingFoodId(food.foodId);
    try {
      await createEntry.mutateAsync({ date, foodId: food.foodId, servingId: food.servingId, servings: food.quantity });
    } catch {
      // The shared Daily Tracker mutation owns the user-facing error toast.
    } finally {
      setAddingFoodId(null);
    }
  };

  const addMeal = async () => {
    for (const food of planner.data?.foods ?? []) await addFood(food);
    for (const recipe of planner.data?.recipes ?? []) {
      setAddingRecipeId(recipe.recipeId);
      try {
        await recipesApi.addToDailyTracker(recipe.recipeId, { date, servings: recipe.quantity });
      } finally {
        setAddingRecipeId(null);
      }
    }
  };

  const moveDate = (days: number) => setDate(format(days < 0 ? subDays(dateObject, 1) : addDays(dateObject, 1), 'yyyy-MM-dd'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader title="Meal Planner" subtitle="Find deterministic meal ideas that fit your recorded targets and today's intake." action={<Button variant="primary" onClick={() => void planner.refetch()} leftIcon={<RefreshCw size={17} />}>Regenerate</Button>} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button type="button" onClick={() => moveDate(-1)} aria-label="Previous day" style={{ border: '1px solid var(--border-light)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', width: 40, height: 40, cursor: 'pointer' }}><ChevronLeft size={18} /></button>
        <div style={{ textAlign: 'center' }}><span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 750, textTransform: 'uppercase' }}>{isToday(dateObject) ? 'Today' : 'Planner date'}</span><h1 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{dateLabel}</h1></div>
        <button type="button" onClick={() => moveDate(1)} aria-label="Next day" style={{ border: '1px solid var(--border-light)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', width: 40, height: 40, cursor: 'pointer' }}><ChevronRight size={18} /></button>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
          <Select label="Meal" value={mealType} onChange={(event) => setMealType(event.target.value as MealPlannerMealType)} options={MEAL_TYPES} />
          <Select label="Focus" value={focus} onChange={(event) => setFocus(event.target.value as MealPlannerFocus)} options={FOCUSES} />
        </div>
      </Card>

      {planner.isLoading ? <LoadingSpinner label="Building a meal from your current targets..." /> : planner.isError ? <EmptyState icon={<UtensilsCrossed size={32} />} title="Could not build a meal" description={planner.error.message} actionLabel="Try again" onAction={() => void planner.refetch()} /> : planner.data && <>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}><ClipboardList size={18} color="var(--color-primary)" /><h2 style={{ fontSize: '1.1rem', fontWeight: 750 }}>Remaining nutrition</h2></div>
          {Object.keys(planner.data.remainingBudget).length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No current targets are configured. The planner will not infer limits.</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>{Object.entries(planner.data.remainingBudget).map(([key, budget]) => <div key={key} style={{ background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', padding: '12px' }}><strong style={{ display: 'block', fontSize: '0.85rem' }}>{nutrientLabels[key] ?? key}</strong><span style={{ fontSize: '1rem', fontWeight: 800 }}>{amount(budget.current)}{budget.target == null ? ` ${budget.unit}` : ` / ${amount(budget.target)} ${budget.unit}`}</span><small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 4 }}>{budget.target == null ? 'Target not configured' : `${amount(budget.remaining)} ${budget.unit} remaining`}</small></div>)}</div>}
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 'var(--space-md)' }}><div><h2 style={{ fontSize: '1.1rem', fontWeight: 750 }}>Recommended {mealType.toLowerCase()}</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 4 }}>Each option was evaluated by the existing nutrition engine.</p></div><Button size="sm" variant="secondary" onClick={() => void addMeal()} disabled={(planner.data.foods.length === 0 && (planner.data.recipes?.length ?? 0) === 0) || createEntry.isPending || addingRecipeId != null} leftIcon={<Plus size={15} />}>Add meal</Button></div>
          {planner.data.foods.length === 0 && (planner.data.recipes?.length ?? 0) === 0 ? <div style={{ padding: 'var(--space-lg)', textAlign: 'center', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No eligible foods or recipes with usable servings were found for this request.</p>{planner.data.limitations.map((limitation) => <p key={limitation} style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 5 }}>{limitation}</p>)}</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {planner.data.foods.map((food) => <div key={food.foodId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><div style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: '0.95rem' }}>{food.displayName}</strong>{food.variantLabel && <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>{food.variantLabel}</small>}<span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 4 }}>{food.servingName} · {food.servingGrams} g · Score {food.score}/100</span><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 7 }}>{food.keyNutrients.slice(0, 4).map((nutrient) => <span key={nutrient.nutrient} style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{nutrientLabels[nutrient.nutrient] ?? nutrient.nutrient}: {amount(nutrient.amount)} {nutrient.unit}</span>)}</div></div><Button size="sm" variant="secondary" onClick={() => void addFood(food)} isLoading={addingFoodId === food.foodId}>Add</Button></div>)}
            {planner.data.recipes?.map((recipe) => <div key={`recipe-${recipe.recipeId}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px', background: 'var(--color-primary-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}><div style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: '0.95rem' }}>{recipe.name}</strong><small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>Saved recipe · {recipe.servingName} · {recipe.servingGrams} g</small><span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 4 }}>Score {recipe.score}/100</span></div><Button size="sm" variant="secondary" onClick={async () => { setAddingRecipeId(recipe.recipeId); try { await recipesApi.addToDailyTracker(recipe.recipeId, { date, servings: recipe.quantity }); } finally { setAddingRecipeId(null); } }} isLoading={addingRecipeId === recipe.recipeId}>Add</Button></div>)}
          </div>}
        </Card>

        {planner.data.aiExplanation && <Card><h2 style={{ fontSize: '1rem', fontWeight: 750 }}>Why these choices</h2><p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 6 }}>{planner.data.aiExplanation.answer}</p></Card>}
        <Card><p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.45 }}>The planner uses your current daily intake, configured targets, and canonical food evaluations. It does not infer missing limits or create synthetic foods.</p><Link to="/daily-tracker" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 700, marginTop: 9 }}>View daily nutrition <ArrowRight size={14} /></Link></Card>
      </>}
    </div>
  );
};
