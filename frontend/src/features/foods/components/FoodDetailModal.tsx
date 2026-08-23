import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Sparkles } from 'lucide-react';
import { useFoodDetail } from '../hooks/useFoods';
import { FoodEvaluationModal } from '@/features/food-evaluation/components/FoodEvaluationModal';
import type { Serving } from '../types/foods.types';
import { formatDisplayNumber, preferredServing, scaleNutrientAmount, servingGrams } from '../utils/serving';

export interface FoodDetailModalProps {
  foodId: string | null;
  onClose: () => void;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({ foodId, onClose }) => {
  const { data: food, isLoading, error } = useFoodDetail(foodId || undefined);
  const [selectedServingId, setSelectedServingId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1.0');
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);

  React.useEffect(() => {
    if (food) {
      setSelectedServingId(preferredServing(food.servings)?.id ?? '');
      setQuantity('1.0');
    }
  }, [food?.id]);

  const defaultServing = preferredServing(food?.servings ?? []);
  const activeServingId = selectedServingId || defaultServing?.id || '';
  const selectedServing: Serving | null =
    food?.servings.find((s) => s.id === activeServingId) || defaultServing || null;
  const selectedGrams = servingGrams(selectedServing, Number.parseFloat(quantity));

  return (
    <>
      <Modal
        isOpen={!!foodId}
        onClose={onClose}
        title={food?.displayName || food?.name || 'Food Details'}
        subtitle={food ? [food.variantLabel, food.category?.name ? `Category: ${food.category.name}` : null].filter(Boolean).join(' · ') : undefined}
        maxWidth="520px"
      >
        {isLoading ? (
          <LoadingSpinner label="Loading nutritional profile..." size={28} />
        ) : error ? (
          <p style={{ color: 'var(--color-danger)', textAlign: 'center' }}>{error.message}</p>
        ) : food ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Serving selector & Quantity */}
            <div
              style={{
                padding: 'var(--space-md)',
                backgroundColor: 'var(--bg-surface-secondary)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)',
              }}
            >
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Serving & Portions</h3>

              {food.servings.length > 0 ? (
                <Select
                  label="Portion Type"
                  value={activeServingId}
                  onChange={(e) => setSelectedServingId(e.target.value)}
                  options={food.servings.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.grams}g)`,
                  }))}
                />
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>100g standard serving</p>
              )}

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Number of Servings
                </label>
                <QuantityStepper value={quantity} onChange={setQuantity} />
              </div>

              {selectedServing && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setIsEvaluationOpen(true)}
                  leftIcon={<Sparkles size={16} />}
                  style={{ marginTop: '4px' }}
                >
                  Can I eat this?
                </Button>
              )}
            </div>

            {/* Primary serving-first nutrition view */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Nutrition for this portion</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDisplayNumber(selectedGrams)} g total</span>
              </div>

              {food.nutrients.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No nutrient details available.</p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '8px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '2px',
                  }}
                >
                  {food.nutrients.map((fn, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: 'var(--bg-surface-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {fn.nutrient.name}
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {scaleNutrientAmount(fn.amount, selectedGrams)} <small style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{fn.nutrient.unit}</small>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <details>
              <summary style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                Nutrition Facts per 100 g
              </summary>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                The official database basis is available here for comparison. Your evaluation and meal logging use the selected serving above.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginTop: '8px' }}>
                {food.nutrients.map((fn) => (
                  <div key={fn.nutrient.id} style={{ padding: '7px 9px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{fn.nutrient.name}</span>
                    <strong style={{ fontSize: '0.82rem' }}>{formatDisplayNumber(Number.parseFloat(fn.amount))} {fn.nutrient.unit}</strong>
                  </div>
                ))}
              </div>
            </details>
            {food.name !== (food.displayName ?? food.name) && <details>
              <summary style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                Source information
              </summary>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                Canonical name: {food.name}
              </p>
            </details>}
          </div>
        ) : null}
      </Modal>

      {/* Pre-Meal Compatibility Modal */}
      {food && selectedServing && (
        <FoodEvaluationModal
          isOpen={isEvaluationOpen}
          onClose={() => setIsEvaluationOpen(false)}
          food={food}
          selectedServing={selectedServing}
          quantity={quantity}
        />
      )}
    </>
  );
};
