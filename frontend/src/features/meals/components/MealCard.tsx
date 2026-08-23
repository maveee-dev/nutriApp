import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Utensils, Trash2, Eye, Coffee, Sun, Moon, Apple } from 'lucide-react';
import type { MealSummary, MealType } from '../types/meals.types';
import { format, parseISO } from 'date-fns';

export interface MealCardProps {
  meal: MealSummary;
  onViewDetail: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onViewDetail,
  onDelete,
  isDeleting = false,
}) => {
  const getMealTypeDetails = (type: MealType) => {
    switch (type) {
      case 'BREAKFAST':
        return { label: 'Breakfast', icon: <Coffee size={16} />, badgeVariant: 'warning' as const };
      case 'LUNCH':
        return { label: 'Lunch', icon: <Sun size={16} />, badgeVariant: 'success' as const };
      case 'DINNER':
        return { label: 'Dinner', icon: <Moon size={16} />, badgeVariant: 'info' as const };
      case 'SNACK':
        return { label: 'Snack', icon: <Apple size={16} />, badgeVariant: 'neutral' as const };
    }
  };

  const { label, icon, badgeVariant } = getMealTypeDetails(meal.mealType);

  let formattedDate = '';
  try {
    formattedDate = format(parseISO(meal.consumedAt), 'h:mm a • MMM d, yyyy');
  } catch {
    formattedDate = meal.consumedAt;
  }

  return (
    <Card interactive style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant={badgeVariant} icon={icon}>
            {label}
          </Badge>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {formattedDate}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => onViewDetail(meal.id)}
            title="View Details"
            style={{
              background: 'var(--bg-surface-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'background-color var(--transition-fast)',
            }}
          >
            <Eye size={16} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(meal.id)}
            disabled={isDeleting}
            title="Delete Meal"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-danger)',
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        <Utensils size={15} color="var(--text-muted)" />
        <span>
          {meal.itemCount} {meal.itemCount === 1 ? 'item' : 'items'} logged
        </span>
      </div>
    </Card>
  );
};
