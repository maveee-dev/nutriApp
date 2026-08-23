import React, { useEffect, useState } from 'react';
import { CalendarDays, Check, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { useDailyMealPlan, useCustomizeMealPlan } from '../hooks/useDailyMealPlan';
import { useAvailableRecipes } from '../hooks/useAvailableRecipes';
import { useCreateMealMutation } from '@/features/meals/hooks/useMeals';
import { toMealPlanCreateRequest, toMealPlanCreateRequestForMeal, type MealPlanMeal, type MealPlanItem, type AvailableRecipeVersion } from '../types/meal-plan.types';

interface DailyMealPlanCardProps { date: string; }

const labelForRole = (role?: string): string => (role ?? 'Component').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

interface MealReviewModalProps {
  meal: MealPlanMeal | null;
  isOpen: boolean;
  optionsForSlot: (meal: MealPlanMeal, role?: string) => AvailableRecipeVersion[];
  isCustomizing: boolean;
  customizeError: string | null;
  onClose: () => void;
  onCustomize: (meal: MealPlanMeal, slotId: string, recipeVersionId: string) => void;
  onConfirm: (meal: MealPlanMeal) => void;
  isLogging: boolean;
  isLogged: boolean;
}

const MealReviewModal: React.FC<MealReviewModalProps> = ({ meal, isOpen, optionsForSlot, isCustomizing, customizeError, onClose, onCustomize, onConfirm, isLogging, isLogged }) => {
  const [changingSlotId, setChangingSlotId] = useState<string | null>(null);
  useEffect(() => setChangingSlotId(null), [meal?.templateVersionId, meal?.customization?.substitutions]);
  if (meal == null) return null;

  return <Modal isOpen={isOpen} onClose={onClose} title="Review & Log Meal" subtitle="Make any changes before saving this recommendation.">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div><span style={{ color: 'var(--color-primary)', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{meal.mealType}</span><h3 style={{ marginTop: 4, fontSize: '1.25rem' }}>{meal.name}</h3></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {meal.slotSelections.map((slot) => {
          const options = optionsForSlot(meal, slot.role);
          const isChanging = changingSlotId === slot.slotId;
          return <div key={slot.slotId} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><div><span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 750 }}>{labelForRole(slot.role)}</span><strong style={{ fontSize: '0.92rem' }}>{slot.label}</strong></div>{options.length > 0 ? <Button variant="secondary" size="sm" onClick={() => setChangingSlotId(isChanging ? null : slot.slotId)}>{isChanging ? 'Done' : 'Change'}</Button> : null}</div>
            {isChanging ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}><span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>Choose a compatible replacement:</span>{options.map((option) => <button key={option.id} type="button" onClick={() => onCustomize(meal, slot.slotId, option.id)} disabled={isCustomizing} style={{ padding: '9px 10px', textAlign: 'left', borderRadius: 'var(--radius-sm)', border: option.id === slot.sourceId ? '1.5px solid var(--color-primary)' : '1px solid var(--border-light)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>{option.name}</button>)}</div> : null}
          </div>;
        })}
      </div>
      <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: meal.evaluation.evaluationStatus === 'insufficient-evidence' ? 'var(--color-clinical-subtle)' : 'var(--color-primary-light)' }}><strong>{meal.evaluation.evaluationStatus === 'insufficient-evidence' ? 'Compatibility unavailable' : `Compatibility ${meal.evaluation.score}%`}</strong><p style={{ marginTop: 3, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{meal.evaluation.evaluationStatus === 'insufficient-evidence' ? 'There is not enough nutrition evidence to score this meal.' : `${meal.evaluation.coverage}% evidence coverage. Your preview is evaluated against your active nutrition policies.`}</p></div>
      {meal.evaluation.contributions.length > 0 ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><strong style={{ fontSize: '0.85rem' }}>Contribution</strong>{meal.evaluation.contributions.map((contribution) => <div key={contribution.nutrient} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-secondary)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.78rem' }}><span>{contribution.nutrient}</span><strong>{contribution.amount}{contribution.targetValue ? ` / ${contribution.targetValue} target` : ''}</strong></div><p style={{ marginTop: 3, fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{contribution.explanation}</p></div>)}</div> : null}
      {meal.evaluation.deferredPolicies?.length ? <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Some meal guidance is paused until more evidence is available.</p> : null}
      <details><summary style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>Why this meal?</summary><div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6, color: 'var(--text-muted)', fontSize: '0.7rem' }}><span>Evaluator: {meal.provenance.evaluatorVersion}</span>{meal.provenance.policySetFingerprint ? <span>Policy set: {meal.provenance.policySetFingerprint}</span> : null}<span>Evaluation: {meal.provenance.evaluationFingerprint}</span></div></details>
      {customizeError ? <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{customizeError}</p> : null}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}><Button variant="secondary" onClick={onClose}>Keep reviewing</Button><Button variant="primary" onClick={() => onConfirm(meal)} disabled={isLogging || isLogged}>{isLogged ? <><Check size={14} /> Logged</> : isLogging ? 'Logging...' : 'Confirm & Log Meal'}</Button></div>
    </div>
  </Modal>;
};

export const DailyMealPlanCard: React.FC<DailyMealPlanCardProps> = ({ date }) => {
  const plan = useDailyMealPlan(date);
  const recipes = useAvailableRecipes();
  const customizeMeal = useCustomizeMealPlan();
  const [logged, setLogged] = useState<Set<string>>(new Set());
  const [customizedMeals, setCustomizedMeals] = useState<Record<string, MealPlanMeal>>({});
  const [reviewingMeal, setReviewingMeal] = useState<MealPlanMeal | null>(null);
  const createMeal = useCreateMealMutation();
  const recipeMeals = plan.data?.meals ?? [];
  const hasRecipeMeals = recipeMeals.length > 0;

  useEffect(() => { setCustomizedMeals({}); setLogged(new Set()); setReviewingMeal(null); }, [date]);

  const logItem = (item: MealPlanItem) => createMeal.mutate(toMealPlanCreateRequest(item, date), { onSuccess: () => setLogged((current) => new Set(current).add(item.foodId)) });
  const mealKey = (meal: MealPlanMeal) => `${meal.mealType}-${meal.templateVersionId}`;
  const logRecipeMeal = (meal: MealPlanMeal) => createMeal.mutate(toMealPlanCreateRequestForMeal(meal, date), { onSuccess: () => setLogged((current) => new Set(current).add(mealKey(meal))) });

  const optionsForSlot = (meal: MealPlanMeal, role?: string): AvailableRecipeVersion[] => [...new Map((recipes.data ?? []).flatMap((recipe) => recipe.versions).filter((version) => version.approvalStatus === 'APPROVED').filter((version) => version.mealTypes.length === 0 || version.mealTypes.includes(meal.mealType)).filter((version) => role == null || version.components.some((component) => component.role === role)).map((version) => [version.id, version])).values()];
  const customizeSlot = (meal: MealPlanMeal, slotId: string, recipeVersionId: string) => {
    const substitutions = meal.slotSelections.filter((slot) => slot.source === 'recipe' && slot.slotId !== slotId).map((slot) => ({ slotId: slot.slotId, recipeVersionId: slot.sourceId }));
    substitutions.push({ slotId, recipeVersionId });
    customizeMeal.mutate({ templateVersionId: meal.templateVersionId, mealType: meal.mealType, substitutions }, { onSuccess: (customized) => { setCustomizedMeals((current) => ({ ...current, [`${date}:${meal.templateVersionId}`]: customized })); setReviewingMeal(customized); } });
  };
  const displayedMeal = (baseMeal: MealPlanMeal) => customizedMeals[`${date}:${baseMeal.templateVersionId}`] ?? baseMeal;

  return <Card style={{ border: '1.5px solid var(--border-light)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 'var(--space-md)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', color: 'var(--color-primary-shadow)', background: 'var(--color-primary-light)' }}><CalendarDays size={18} /></span><div><span style={{ color: 'var(--color-primary)', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your plan</span><h2 style={{ fontSize: '1.1rem', fontWeight: 750 }}>Small ideas for today</h2></div></div><Button variant="secondary" size="sm" onClick={() => void plan.refetch()} disabled={plan.isFetching} leftIcon={<RefreshCw size={14} />}>Refresh</Button></div>
    {plan.isLoading ? <LoadingSpinner label="Building a plan from your active goals..." size={20} /> : plan.isError ? <div style={{ color: 'var(--color-danger)' }}><p>{plan.error.message}</p><Button variant="secondary" size="sm" onClick={() => void plan.refetch()} style={{ marginTop: 8 }}>Try again</Button></div> : !hasRecipeMeals && (plan.data?.items.length ?? 0) === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No complete meals are available for a plan yet.</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{hasRecipeMeals ? recipeMeals.map((baseMeal) => { const meal = displayedMeal(baseMeal); return <div key={`${meal.mealType}-${meal.templateVersionId}`} style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-secondary)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}><div><strong>{meal.mealType.charAt(0) + meal.mealType.slice(1).toLowerCase()}</strong><p style={{ fontSize: '0.96rem', color: 'var(--text-primary)', marginTop: 3, fontWeight: 750 }}>{meal.name}</p><p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 5 }}>{meal.slotSelections.map((slot) => `${labelForRole(slot.role)}: ${slot.label}`).join(' · ')}</p><p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 5 }}>{meal.evaluation.evaluationStatus === 'insufficient-evidence' ? 'Compatibility unavailable' : `Compatibility ${meal.evaluation.score}%`} · {meal.evaluation.coverage}% evidence coverage</p></div><Button variant={logged.has(mealKey(meal)) ? 'secondary' : 'primary'} size="sm" onClick={() => setReviewingMeal(meal)} disabled={logged.has(mealKey(meal))} leftIcon={logged.has(mealKey(meal)) ? <Check size={14} /> : undefined}>{logged.has(mealKey(meal)) ? 'Logged' : 'Log meal'}</Button></div></div>; }) : plan.data?.items.map((item) => <div key={`${item.mealType}-${item.foodId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-secondary)' }}><div><strong>{item.mealType.charAt(0) + item.mealType.slice(1).toLowerCase()}</strong><p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 2 }}>{item.foodDisplayName ?? item.foodName} · {item.servingName}</p>{item.foodVariantLabel && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.foodVariantLabel}</p>}<p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.evaluation.evaluationStatus === 'insufficient-evidence' ? 'Compatibility unavailable' : `Compatibility ${item.evaluation.score}%`} · {item.evaluation.coverage}% evidence coverage</p></div><Button variant={logged.has(item.foodId) ? 'secondary' : 'primary'} size="sm" onClick={() => logItem(item)} disabled={logged.has(item.foodId) || createMeal.isPending} leftIcon={logged.has(item.foodId) ? <Check size={14} /> : undefined}>{logged.has(item.foodId) ? 'Logged' : 'Log meal'}</Button></div>)}</div>}
    {plan.data?.deferredPolicies.length ? <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Some suggestions may be less personalized while required evidence is unavailable.</p> : null}
    <MealReviewModal meal={reviewingMeal} isOpen={reviewingMeal != null} optionsForSlot={optionsForSlot} isCustomizing={customizeMeal.isPending} customizeError={customizeMeal.error?.message ?? null} onClose={() => setReviewingMeal(null)} onCustomize={customizeSlot} onConfirm={logRecipeMeal} isLogging={createMeal.isPending} isLogged={reviewingMeal != null && logged.has(mealKey(reviewingMeal))} />
  </Card>;
};
