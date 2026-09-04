import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MealCard } from '../components/MealCard';
import { MealLogModal } from '../components/MealLogModal';
import { MealDetailModal } from '../components/MealDetailModal';
import { useMeals, useDeleteMealMutation } from '../hooks/useMeals';
import { Plus, Search, UtensilsCrossed } from 'lucide-react';
import type { MealType } from '../types/meals.types';

export const MealsPage: React.FC = () => {
  const [selectedMealType, setSelectedMealType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [viewingMealId, setViewingMealId] = useState<string | null>(null);

  const queryParams = {
    search: searchQuery || undefined,
    mealType: selectedMealType === 'ALL' ? undefined : (selectedMealType as MealType),
    sortBy: 'consumedAt' as const,
    sortOrder: 'desc' as const,
    limit: 50,
  };

  const { data, isLoading, isError, error, refetch } = useMeals(queryParams);
  const deleteMealMutation = useDeleteMealMutation();

  const meals = data?.items || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader
        title="Meal Log"
        subtitle="Build a meal from several foods, then keep it in your daily record."
        action={
          <Button
            variant="primary"
            onClick={() => setIsLogModalOpen(true)}
            leftIcon={<Plus size={18} />}
          >
            Build a meal
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <SegmentedControl<string>
          value={selectedMealType}
          onChange={setSelectedMealType}
          options={[
            { value: 'ALL', label: 'All Meals' },
            { value: 'BREAKFAST', label: 'Breakfast' },
            { value: 'LUNCH', label: 'Lunch' },
            { value: 'DINNER', label: 'Dinner' },
            { value: 'SNACK', label: 'Snacks' },
          ]}
        />

        <Input
          placeholder="Search logged meals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={18} />}
        />
      </div>

      {/* Meals List */}
      {isLoading ? (
        <LoadingSpinner label="Loading your meals..." />
      ) : isError ? (
        <EmptyState icon={<UtensilsCrossed size={32} />} title="Could not load your meals" description={error?.message || 'Please try again.'} actionLabel="Try again" onAction={() => void refetch()} />
      ) : meals.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed size={32} />}
          title="No meals logged yet"
          description="Log your first meal to see your daily nutrient breakdown and progress."
          actionLabel="+ Build a meal"
          onAction={() => setIsLogModalOpen(true)}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--space-md)',
          }}
        >
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onViewDetail={(id) => setViewingMealId(id)}
              onDelete={(id) => deleteMealMutation.mutate(id)}
              isDeleting={deleteMealMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <MealLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        defaultMealType={selectedMealType !== 'ALL' ? (selectedMealType as MealType) : 'BREAKFAST'}
      />

      <MealDetailModal
        mealId={viewingMealId}
        onClose={() => setViewingMealId(null)}
      />
    </div>
  );
};
