import React, { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CompatibilityScoreCard } from '@/components/ui/CompatibilityScoreCard';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useFoodEvaluation } from '../hooks/useFoodEvaluation';
import type { FoodDetail, Serving } from '@/features/foods/types/foods.types';
import { scaleNutrientAmount, servingGrams } from '@/features/foods/utils/serving';
import { formatContributionExplanation } from '../foodEvaluationPresentation';
import { recipesApi } from '@/features/recipes/api/recipesApi';
import type { RecipeEvaluation } from '@/features/recipes/types/recipe.types';
import type { FoodEvaluationResponse } from '../types/evaluation.types';

const notableNutrientPatterns = [
  /^(?:energy|calories)$/i,
  /^protein/i,
  /^carbohydrate/i,
  /^fiber|^dietary fiber/i,
  /^potassium/i,
  /^sodium/i,
  /^fat, total/i,
  /^fatty acids, total saturated/i,
  /^cholesterol/i,
  /^calcium/i,
  /^iron/i,
  /^vitamin c/i,
];

function notableNutrients(food: FoodDetail) {
  return food.nutrients.filter(({ nutrient }) => {
    const name = nutrient.name.trim().replace(/\s+/g, ' ');
    return notableNutrientPatterns.some((pattern) => pattern.test(name));
  });
}

export interface FoodEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  food: FoodDetail | null;
  selectedServing: Serving | null;
  quantity: string;
  /** Optional recipe context; recipes use the same presentation with a different evaluation source. */
  recipe?: FoodEvaluationRecipeContext | null;
  onAddToMeal?: () => void;
  addActionLabel?: string;
}

export interface FoodEvaluationRecipeContext {
  id: string;
  version: number;
  name: string;
}

type EvaluationViewData = FoodEvaluationResponse & {
  limitations?: string[];
};

function toFoodEvaluationResponse(recipeEvaluation: RecipeEvaluation | null): EvaluationViewData | null {
  if (!recipeEvaluation) return null;

  const provenance = recipeEvaluation.provenance as {
    evaluatorVersion?: string;
    policySetFingerprint?: string | null;
  } | null;

  return {
    score: recipeEvaluation.evaluation.score,
    evaluationStatus: recipeEvaluation.evaluation.evaluationStatus,
    coverage: recipeEvaluation.evaluation.coverage,
    reasons: recipeEvaluation.evaluation.reasons as FoodEvaluationResponse['reasons'],
    contributions: recipeEvaluation.evaluation.contributions as FoodEvaluationResponse['contributions'],
    deferredPolicies: recipeEvaluation.evaluation.deferredPolicies as FoodEvaluationResponse['deferredPolicies'],
    nutritionInsights: recipeEvaluation.evaluation.nutritionInsights as FoodEvaluationResponse['nutritionInsights'],
    evaluatorVersion: provenance?.evaluatorVersion,
    policySetFingerprint: provenance?.policySetFingerprint,
    limitations: recipeEvaluation.limitations,
  };
}

export const FoodEvaluationModal: React.FC<FoodEvaluationModalProps> = ({
  isOpen,
  onClose,
  food: foodInput,
  selectedServing: selectedServingInput,
  quantity,
  recipe = null,
  onAddToMeal,
  addActionLabel = 'Log to Meal',
}) => {
  const foodEvaluation = useFoodEvaluation();
  const [recipeEvaluation, setRecipeEvaluation] = React.useState<RecipeEvaluation | null>(null);
  const [isRecipePending, setIsRecipePending] = React.useState(false);
  const [recipeError, setRecipeError] = React.useState<Error | null>(null);
  const food = foodInput;
  const selectedServing = selectedServingInput;

  useEffect(() => {
    if (!isOpen || recipe || !food || !selectedServing || !quantity) return;

    foodEvaluation.mutate({
        foodId: food.id,
        servingId: selectedServing.id,
        quantity,
    });
  }, [isOpen, recipe?.id, food?.id, selectedServing?.id, quantity, foodEvaluation.mutate]);

  useEffect(() => {
    if (!isOpen || !recipe) {
      setRecipeEvaluation(null);
      setRecipeError(null);
      setIsRecipePending(false);
      return;
    }

    let active = true;
    setRecipeEvaluation(null);
    setRecipeError(null);
    setIsRecipePending(true);

    recipesApi.evaluate(recipe.id, { version: recipe.version, servings: quantity })
      .then((result) => {
        if (active) setRecipeEvaluation(result);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setRecipeError(reason instanceof Error ? reason : new Error('Could not evaluate recipe'));
      })
      .finally(() => {
        if (active) setIsRecipePending(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, recipe?.id, recipe?.version, quantity]);

  if (!recipe && (!food || !selectedServing)) return null;
  const data: EvaluationViewData | null = recipe ? toFoodEvaluationResponse(recipeEvaluation) : foodEvaluation.data ?? null;
  const isPending = recipe ? isRecipePending : foodEvaluation.isPending;
  const error = recipe ? recipeError : foodEvaluation.error;
  const selectedGrams = food && selectedServing
    ? servingGrams(selectedServing, Number.parseFloat(quantity))
    : null;
  const notableNutrientItems = food && selectedGrams != null ? notableNutrients(food) : [];
  const deferredPolicies = data?.deferredPolicies ?? [];
  const hasPartialEvaluation = data != null && (data.coverage < 100 || deferredPolicies.length > 0);
  const subjectName = recipe?.name ?? food?.displayName ?? food?.name ?? 'Food';
  const subtitle = recipe
    ? `${subjectName} • ${quantity} serving${quantity === '1' ? '' : 's'}`
    : `${subjectName}${food?.variantLabel ? ` · ${food.variantLabel}` : ''} • ${quantity} ${selectedServing?.name ?? 'serving'}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Can I eat this?"
      subtitle={subtitle}
      maxWidth="480px"
    >
      {isPending ? (
        <LoadingSpinner label="Evaluating against your personalized targets..." size={28} />
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-md) 0' }}>
          <AlertCircle size={36} color="var(--color-danger)" style={{ margin: '0 auto var(--space-xs)' }} />
          <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Could not evaluate this item</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{error.message}</p>
        </div>
          ) : data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Score Header */}
          {data.evaluationStatus === 'insufficient-evidence' ? (
            <div style={{ padding: '16px', backgroundColor: 'var(--color-clinical-subtle)', border: '1px solid var(--color-clinical-light)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Info size={22} color="var(--color-clinical)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-clinical-hover)' }}>Not enough evidence to score this food</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.45 }}>Some applicable nutrition data is missing, so this result is not a positive or negative compatibility judgment.</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>Some clinically relevant guidance could not be evaluated for this portion.</p>
              </div>
            </div>
          ) : (
            <CompatibilityScoreCard score={data.score} partial={hasPartialEvaluation} />
          )}

          {data.nutritionInsights && data.nutritionInsights.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Nutrition Insights
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.nutritionInsights.map((insight) => (
                  <div
                    key={`${insight.category}-${insight.title}`}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-surface-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{insight.title}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {insight.evidence.amount} {insight.evidence.unit}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '4px' }}>
                      {insight.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reasons List */}
          {data.reasons && data.reasons.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Compatibility Evaluation
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.reasons.map((reason, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-surface-secondary)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>
                      {reason.direction === 'negative' ? (
                        <AlertTriangle size={16} color="var(--color-danger)" />
                      ) : reason.direction === 'neutral' ? (
                        <AlertTriangle size={16} color="var(--color-accent)" />
                      ) : (
                        <CheckCircle2 size={16} color="var(--color-primary)" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {reason.explanation}
                      </p>
                      {(reason.measuredValue || reason.targetValue) && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {reason.nutrient}: {reason.measuredValue}{' '}
                          {reason.targetValue ? `(Reference: ${reason.targetValue})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.contributions && data.contributions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Contribution
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.contributions.map((contribution) => (
                  <div key={contribution.nutrient} style={{ padding: '10px 14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{contribution.nutrient}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{contribution.amount}{contribution.targetValue ? ` / ${contribution.targetValue} target` : ''}</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '4px' }}>{formatContributionExplanation(contribution)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notableNutrientItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Notable Nutrients
                </h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>for this portion (selected serving)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px' }}>
                {notableNutrientItems.map(({ nutrient, amount }) => (
                  <div key={nutrient.id} style={{ padding: '8px 10px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{nutrient.name}</span>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{scaleNutrientAmount(amount, selectedGrams ?? 0)} {nutrient.unit}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deferred Policies Callout */}
          {deferredPolicies.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {deferredPolicies.map((policy) => (
                <div
                  key={`${policy.policyId}-${policy.reason}`}
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--color-clinical-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-clinical-light)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <Info size={16} color="var(--color-clinical)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-clinical-hover)' }}>
                      Information Note
                    </span>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {policy.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.limitations && data.limitations.length > 0 && (
            <details>
              <summary style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>Evaluation limitations</summary>
              <ul style={{ margin: '6px 0 0 18px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                {data.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
              </ul>
            </details>
          )}

          {(data.evaluatorVersion || data.policySetFingerprint || data.snapshotVersion) && (
            <details>
              <summary style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>Evaluation details</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                {data.evaluatorVersion && <span>Evaluator: {data.evaluatorVersion}</span>}
                {data.policySetFingerprint && <span>Policy set: {data.policySetFingerprint}</span>}
                {data.snapshotVersion && <span>Snapshot: {data.snapshotVersion}</span>}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
            <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
              Done
            </Button>
            {onAddToMeal && (
              <Button variant="primary" onClick={onAddToMeal} style={{ flex: 1 }}>
                {addActionLabel}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
