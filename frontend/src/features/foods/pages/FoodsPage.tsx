import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { FoodDetailModal } from '../components/FoodDetailModal';
import { useFoods } from '../hooks/useFoods';
import { Search, Apple, ChevronRight } from 'lucide-react';

export const FoodsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useFoods({
    search: searchQuery || undefined,
    limit: 50,
  });

  const foods = data?.items || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader
        title="Food Catalog"
        subtitle="Search ingredients and check their nutrient balance before eating."
      />

      {/* Search Input */}
      <Input
        placeholder="Search foods by name (e.g. Oatmeal, Salmon, Banana)..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leftIcon={<Search size={18} />}
      />

      {/* Foods Grid */}
      {isLoading ? (
        <LoadingSpinner label="Searching food catalog..." />
      ) : isError ? (
        <EmptyState icon={<Apple size={32} />} title="Could not load the food catalog" description={error?.message || 'Please try again.'} actionLabel="Try again" onAction={() => void refetch()} />
      ) : foods.length === 0 ? (
        <EmptyState
          icon={<Apple size={32} />}
          title="No foods found"
          description={searchQuery ? `No food results matching "${searchQuery}". Try a different keyword.` : 'Explore nutritional foods in the catalog.'}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--space-md)',
          }}
        >
          {foods.map((food) => (
            <Card
              key={food.id}
              interactive
              onClick={() => setSelectedFoodId(food.id)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary-shadow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Apple size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.975rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {food.displayName ?? food.name}
                  </h3>
                  {food.variantLabel && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{food.variantLabel}</p>}
                  <Badge variant="neutral" size="sm" style={{ marginTop: '2px' }}>
                    {food.category.name}
                  </Badge>
                </div>
              </div>

              <ChevronRight size={18} color="var(--text-muted)" />
            </Card>
          ))}
        </div>
      )}

      {/* Food Detail Modal */}
      <FoodDetailModal
        foodId={selectedFoodId}
        onClose={() => setSelectedFoodId(null)}
      />
    </div>
  );
};
