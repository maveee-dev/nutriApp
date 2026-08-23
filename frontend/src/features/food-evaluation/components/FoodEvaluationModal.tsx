import React, { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useFoodEvaluation } from '../hooks/useFoodEvaluation';
import type { FoodDetail, Serving } from '@/features/foods/types/foods.types';
import { scaleNutrientAmount, servingGrams } from '@/features/foods/utils/serving';

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
  onAddToMeal?: () => void;
}

export const FoodEvaluationModal: React.FC<FoodEvaluationModalProps> = ({
  isOpen,
  onClose,
  food,
  selectedServing,
  quantity,
  onAddToMeal,
}) => {
  const { mutate, data, isPending, error } = useFoodEvaluation();

  useEffect(() => {
    if (isOpen && food && selectedServing && quantity) {
      mutate({
        foodId: food.id,
        servingId: selectedServing.id,
        quantity,
      });
    }
  }, [isOpen, food, selectedServing, quantity, mutate]);

  if (!food || !selectedServing) return null;
  const selectedGrams = servingGrams(selectedServing, Number.parseFloat(quantity));

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'var(--color-primary-light)', text: 'var(--color-primary-shadow)', label: 'Looks like a great fit' };
    if (score >= 50) return { bg: 'var(--color-accent-light)', text: 'var(--color-accent-shadow)', label: 'A reasonable choice with trade-offs' };
    return { bg: 'var(--color-danger-light)', text: 'var(--color-danger-shadow)', label: 'Worth balancing with other choices' };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Can I eat this?"
      subtitle={`${food.name} • ${quantity} ${selectedServing.name}`}
      maxWidth="480px"
    >
      {isPending ? (
        <LoadingSpinner label="Evaluating against your personalized targets..." size={28} />
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-md) 0' }}>
          <AlertCircle size={36} color="var(--color-danger)" style={{ margin: '0 auto var(--space-xs)' }} />
          <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Could not evaluate food</p>
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
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>{data.coverage}% evidence coverage</p>
              </div>
            </div>
          ) : (() => {
              const { bg, text, label } = getScoreColor(data.score);
              return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: bg,
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-sm)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: text, lineHeight: 1 }}>
                    {data.score}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    / 100
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: text }}>{label}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    A friendly check against your current goals and nutrition guidance
                  </p>
                </div>
              </div>
              );
            })()}

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
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '4px' }}>{contribution.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notableNutrients(food).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Notable Nutrients
                </h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>for this portion (selected serving)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px' }}>
                {notableNutrients(food).map(({ nutrient, amount }) => (
                  <div key={nutrient.id} style={{ padding: '8px 10px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{nutrient.name}</span>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{scaleNutrientAmount(amount, selectedGrams)} {nutrient.unit}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deferred Policies Callout */}
          {data.deferredPolicies && data.deferredPolicies.length > 0 && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-clinical-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-clinical-light)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <Info size={16} color="var(--color-clinical)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-clinical-hover)' }}>
                  Information Note
                </span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {data.deferredPolicies[0].explanation}
                </p>
              </div>
            </div>
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
                Log to Meal
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
