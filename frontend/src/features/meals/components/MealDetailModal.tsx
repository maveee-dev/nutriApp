import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { useMealDetail } from '../hooks/useMeals';
import { format, parseISO } from 'date-fns';

export interface MealDetailModalProps {
  mealId: string | null;
  onClose: () => void;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({ mealId, onClose }) => {
  const { data: meal, isLoading, error } = useMealDetail(mealId || undefined);

  let formattedDate = '';
  if (meal?.consumedAt) {
    try {
      formattedDate = format(parseISO(meal.consumedAt), 'EEEE, MMMM d, yyyy • h:mm a');
    } catch {
      formattedDate = meal.consumedAt;
    }
  }

  return (
    <Modal
      isOpen={!!mealId}
      onClose={onClose}
      title={meal ? `${meal.mealType.charAt(0) + meal.mealType.slice(1).toLowerCase()} Breakdown` : 'Meal Details'}
      subtitle={formattedDate}
      maxWidth="500px"
    >
      {isLoading ? (
        <LoadingSpinner label="Loading meal items..." size={28} />
      ) : error ? (
        <p style={{ color: 'var(--color-danger)', textAlign: 'center' }}>{error.message}</p>
      ) : meal ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant="success">
              {meal.items.length} {meal.items.length === 1 ? 'Food Item' : 'Food Items'}
            </Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {meal.items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.food.displayName ?? item.food.name}
                  </h4>
                  {item.food.variantLabel && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.food.variantLabel}</p>}
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Serving: {item.serving.name} ({item.serving.grams}g basis)
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    flexShrink: 0,
                  }}
                >
                  {item.quantity} × serving
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
