import React, { useState } from 'react';
import { format } from 'date-fns';
import { ExternalLink, FlaskConical, HeartPulse, Info, Plus, RefreshCw, Sparkles, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Select } from '@/components/ui/Select';
import { FoodEvaluationModal } from '@/features/food-evaluation/components/FoodEvaluationModal';
import { foodsApi } from '@/features/foods/api/foodsApi';
import { recipesApi } from '@/features/recipes/api/recipesApi';
import type { FoodDetail, Serving } from '@/features/foods/types/foods.types';
import { useCreateDailyNutritionEntryMutation } from '@/features/daily-tracker/hooks/useDailyTracker';
import { useRecommendations } from '../hooks/useRecommendations';
import type { PersonalizedRecommendationFood, PersonalizedRecommendationRecipe, RecommendationGoal, RecommendationMealType } from '../types/recommendation.types';

const GOALS: { value: RecommendationGoal; label: string }[] = [
  { value: 'BALANCED', label: 'Balanced choices' },
  { value: 'HIGHER_PROTEIN', label: 'Higher protein' },
  { value: 'HIGHER_FIBER', label: 'Higher fiber' },
  { value: 'LOWER_SODIUM', label: 'Lower sodium' },
  { value: 'LOWER_PHOSPHORUS', label: 'Lower phosphorus' },
  { value: 'LOWER_POTASSIUM', label: 'Lower potassium' },
  { value: 'ENERGY_SUPPORT', label: 'Energy support' },
  { value: 'HEART_HEALTHY', label: 'Heart healthy' },
];

const MEAL_TYPES: { value: RecommendationMealType; label: string }[] = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'SNACK', label: 'Snack' },
];

const nutrientLabels: Record<string, string> = {
  calories: 'Calories', protein: 'Protein', carbohydrates: 'Carbs', fiber: 'Fiber', sodium: 'Sodium', potassium: 'Potassium', phosphorus: 'Phosphorus', cholesterol: 'Cholesterol', 'saturated-fat': 'Saturated fat', 'added-sugar': 'Added sugar',
};

function amount(value: string | null | undefined): string {
  if (value == null) return '—';
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed >= 100 ? Math.round(parsed).toString() : (Math.round(parsed * 10) / 10).toString();
}

export const RecommendationsPage: React.FC = () => {
  const [goal, setGoal] = useState<RecommendationGoal>('BALANCED');
  const [mealType, setMealType] = useState<RecommendationMealType | ''>('');
  const [date] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [addingFoodId, setAddingFoodId] = useState<string | null>(null);
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodDetail | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<PersonalizedRecommendationFood | null>(null);
  const [selectedServing, setSelectedServing] = useState<Serving | null>(null);
  const recommendations = useRecommendations({ goal, mealType: mealType || undefined, date, limit: 8 });
  const createEntry = useCreateDailyNutritionEntryMutation();

  const addFood = async (food: PersonalizedRecommendationFood) => {
    setAddingFoodId(food.foodId);
    try {
      await createEntry.mutateAsync({ date, foodId: food.foodId, servingId: food.servingId, servings: food.quantity });
    } finally {
      setAddingFoodId(null);
    }
  };

  const openEvaluation = async (food: PersonalizedRecommendationFood) => {
    try {
      const detail = await foodsApi.getFoodById(food.foodId);
      const serving = detail.servings.find((item) => item.id === food.servingId) ?? detail.servings[0] ?? null;
      setSelectedFood(detail);
      setSelectedServing(serving);
      setSelectedRecommendation(food);
    } catch {
      // The recommendation remains visible; the existing food detail/evaluation flows own their errors.
    }
  };

  const addRecipe = async (recipe: PersonalizedRecommendationRecipe) => {
    setAddingRecipeId(recipe.recipeId);
    try {
      await recipesApi.addToDailyTracker(recipe.recipeId, { date, servings: recipe.quantity });
    } finally {
      setAddingRecipeId(null);
    }
  };

  const closeEvaluation = () => {
    setSelectedFood(null);
    setSelectedServing(null);
    setSelectedRecommendation(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader title="Recommended for you" subtitle="Personalized food choices based on your recorded profile, targets, intake, and canonical food evaluations." action={<Button variant="primary" onClick={() => void recommendations.refetch()} leftIcon={<RefreshCw size={17} />}>Refresh</Button>} />

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 'var(--space-md)' }}>
          <Select label="What would help most?" value={goal} onChange={(event) => setGoal(event.target.value as RecommendationGoal)} options={GOALS} />
          <Select label="Meal type (optional)" value={mealType} onChange={(event) => setMealType(event.target.value as RecommendationMealType | '')} options={[{ value: '', label: 'Any meal' }, ...MEAL_TYPES]} />
        </div>
      </Card>

      {recommendations.isLoading ? <LoadingSpinner label="Finding foods that fit your current guidance..." /> : recommendations.isError ? <EmptyState icon={<Sparkles size={32} />} title="Recommendations are taking a moment" description={recommendations.error.message} actionLabel="Try again" onAction={() => void recommendations.refetch()} /> : recommendations.data && <>
        {(recommendations.data.profileConsiderations.length > 0 || recommendations.data.laboratoryConsiderations.length > 0) && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
          {recommendations.data.profileConsiderations.length > 0 && <Card padding="md"><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><HeartPulse size={18} color="var(--color-primary)" /><strong>Your profile</strong></div>{recommendations.data.profileConsiderations.map((item) => <p key={item} style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.45 }}>{item}</p>)}</Card>}
          {recommendations.data.laboratoryConsiderations.length > 0 && <Card padding="md"><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><FlaskConical size={18} color="var(--color-clinical)" /><strong>Laboratory considerations</strong></div>{recommendations.data.laboratoryConsiderations.map((item) => <p key={item} style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.45 }}>{item}</p>)}</Card>}
        </div>}

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}><Info size={19} color="var(--color-primary)" /><div><h2 style={{ fontSize: '1.1rem', fontWeight: 750 }}>Remaining nutrition budget</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>Current intake and configured targets are shown for context. Missing targets are never inferred.</p></div></div>
          {Object.keys(recommendations.data.remainingBudget).length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>No current daily targets are configured.</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>{Object.entries(recommendations.data.remainingBudget).map(([key, budget]) => <div key={key} style={{ padding: 11, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-secondary)' }}><strong style={{ display: 'block', fontSize: '0.82rem' }}>{nutrientLabels[key] ?? key}</strong><span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 800, marginTop: 4 }}>{amount(budget.current)} {budget.unit}</span><small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 4 }}>{budget.target == null ? 'Target not configured' : `${amount(budget.remaining)} ${budget.unit} remaining`}</small></div>)}</div>}
        </Card>

        {(recommendations.data.recipeRecommendations?.length ?? 0) > 0 && <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}><UtensilsCrossed size={19} color="var(--color-primary)" /><div><h2 style={{ fontSize: '1.1rem', fontWeight: 750 }}>Recommended recipes</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>Your saved recipes are evaluated through the same nutrition engine.</p></div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{recommendations.data.recipeRecommendations?.map((recipe) => <RecipeRecommendationCard key={recipe.recipeId} recipe={recipe} onAdd={() => void addRecipe(recipe)} isAdding={addingRecipeId === recipe.recipeId} />)}</div>
        </Card>}

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}><Sparkles size={19} color="var(--color-primary)" /><div><h2 style={{ fontSize: '1.1rem', fontWeight: 750 }}>Recommended foods</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>{goal.replaceAll('_', ' ').toLowerCase()} · Evaluated using the existing deterministic nutrition engine</p></div></div>
          {recommendations.data.recommendations.length === 0 ? <div style={{ padding: 'var(--space-lg)', textAlign: 'center', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No eligible catalog foods were found for this request.</p>{recommendations.data.limitations.map((item) => <p key={item} style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 5 }}>{item}</p>)}</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{recommendations.data.recommendations.map((food) => <RecommendationCard key={food.foodId} food={food} onAdd={() => void addFood(food)} onOpenEvaluation={() => void openEvaluation(food)} isAdding={addingFoodId === food.foodId} />)}</div>}
        </Card>

        {recommendations.data.limitations.length > 0 && <Card padding="md"><div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><Info size={17} color="var(--color-clinical)" style={{ flexShrink: 0, marginTop: 2 }} /><div><strong style={{ fontSize: '0.85rem' }}>A note about these recommendations</strong>{recommendations.data.limitations.map((item) => <p key={item} style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.45, marginTop: 4 }}>{item}</p>)}</div></div></Card>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><Link to="/daily-tracker" style={{ textDecoration: 'none' }}><Button variant="secondary" size="sm" leftIcon={<Plus size={15} />}>View daily intake</Button></Link><Link to="/health" style={{ textDecoration: 'none' }}><Button variant="secondary" size="sm" leftIcon={<HeartPulse size={15} />}>Update Health</Button></Link></div>
      </>}

      <FoodEvaluationModal isOpen={selectedFood != null && selectedServing != null} onClose={closeEvaluation} food={selectedFood} selectedServing={selectedServing} quantity={selectedRecommendation?.quantity ?? '1'} onAddToMeal={selectedRecommendation == null ? undefined : () => { void addFood(selectedRecommendation); closeEvaluation(); }} addActionLabel="Add to today" />
    </div>
  );
};

interface RecommendationCardProps {
  food: PersonalizedRecommendationFood;
  onAdd: () => void;
  onOpenEvaluation: () => void;
  isAdding: boolean;
}

interface RecipeRecommendationCardProps {
  recipe: PersonalizedRecommendationRecipe;
  onAdd: () => void;
  isAdding: boolean;
}

const RecipeRecommendationCard: React.FC<RecipeRecommendationCardProps> = ({ recipe, onAdd, isAdding }) => (
  <div style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}><div><strong style={{ display: 'block', fontSize: '1rem' }}>{recipe.name}</strong><span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 5 }}>{recipe.servingName} · {recipe.servingGrams} g</span></div><span style={{ color: recipe.evaluationStatus === 'evaluated' ? 'var(--color-primary)' : 'var(--color-clinical)', fontWeight: 800, fontSize: '0.85rem' }}>{recipe.compatibilityScore}/100</span></div>
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.45, marginTop: 10 }}>{recipe.whyRecommended}</p>
    {recipe.nutritionHighlights.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>{recipe.nutritionHighlights.slice(0, 4).map((item) => <span key={item.nutrient} style={{ padding: '4px 7px', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{nutrientLabels[item.nutrient] ?? item.nutrient}: {amount(item.amount)} {item.unit}</span>)}</div>}
    {recipe.nutritionInsights.slice(0, 2).map((insight) => <p key={`${insight.category}-${insight.title}`} style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', lineHeight: 1.4, marginTop: 7 }}><strong>{insight.title}:</strong> {insight.message}</p>)}
    <Button size="sm" variant="primary" onClick={onAdd} isLoading={isAdding} leftIcon={<Plus size={15} />}>Add to daily intake</Button>
  </div>
);

const RecommendationCard: React.FC<RecommendationCardProps> = ({ food, onAdd, onOpenEvaluation, isAdding }) => (
  <div style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}><div style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: '1rem' }}>{food.displayName}</strong>{food.variantLabel && <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>{food.variantLabel}</small>}<span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 5 }}>{food.servingName} · {food.servingGrams} g · {food.category}</span></div><div style={{ textAlign: 'right', flexShrink: 0 }}><span style={{ display: 'block', color: food.evaluationStatus === 'evaluated' ? 'var(--color-primary)' : 'var(--color-clinical)', fontWeight: 800, fontSize: '0.85rem' }}>{food.compatibilityScore}/100</span><small style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{food.coverage}% coverage</small></div></div>
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.45, marginTop: 10 }}>{food.whyRecommended}</p>
    {food.nutritionHighlights.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>{food.nutritionHighlights.map((item) => <span key={item.nutrient} style={{ padding: '4px 7px', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{nutrientLabels[item.nutrient] ?? item.nutrient}: {amount(item.amount)} {item.unit}</span>)}</div>}
    {food.remainingBudgetImpact.filter((item) => item.targetConfigured).slice(0, 4).length > 0 && <div style={{ marginTop: 9, paddingTop: 8, borderTop: '1px solid var(--border-light)' }}><small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: 4 }}>After this serving</small>{food.remainingBudgetImpact.filter((item) => item.targetConfigured).slice(0, 4).map((item) => <span key={item.nutrient} style={{ display: 'inline-block', marginRight: 10, color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{nutrientLabels[item.nutrient] ?? item.nutrient}: {amount(item.remainingAfter)} {item.unit} left</span>)}</div>}
    {food.nutritionInsights.length > 0 && <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 4 }}>{food.nutritionInsights.slice(0, 2).map((insight) => <p key={`${insight.category}-${insight.title}`} style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', lineHeight: 1.4 }}><strong>{insight.title}:</strong> {insight.message}</p>)}</div>}
    {food.limitations.length > 0 && <p style={{ color: 'var(--color-clinical-hover)', fontSize: '0.75rem', lineHeight: 1.4, marginTop: 8 }}>{food.limitations[0]}</p>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}><Button size="sm" variant="primary" onClick={onAdd} isLoading={isAdding} leftIcon={<Plus size={15} />}>Add to daily intake</Button><Button size="sm" variant="secondary" onClick={onOpenEvaluation} leftIcon={<ExternalLink size={15} />}>Open Food Evaluation</Button></div>
  </div>
);
