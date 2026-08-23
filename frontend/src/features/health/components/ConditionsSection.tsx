import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAvailableConditions, useMyConditions, useAddConditionMutation, useRemoveConditionMutation } from '../hooks/useHealth';
import { HeartPulse, Plus, X } from 'lucide-react';

export const ConditionsSection: React.FC = () => {
  const { data: catalogData, isLoading: isCatalogLoading, isError: isCatalogError, error: catalogError, refetch: refetchCatalog } = useAvailableConditions();
  const { data: myData, isLoading: isMyLoading, isError: isMyError, error: myError, refetch: refetchMine } = useMyConditions();

  const addMutation = useAddConditionMutation();
  const removeMutation = useRemoveConditionMutation();

  const [selectedConditionId, setSelectedConditionId] = useState<string>('');

  const catalog = catalogData?.items || [];
  const myConditions = myData?.items || [];

  // Filter out conditions already added
  const unselectedConditions = catalog.filter(
    (c) => !myConditions.some((mc) => mc.condition.id === c.id)
  );

  const handleAdd = () => {
    if (!selectedConditionId) return;
    addMutation.mutate(selectedConditionId, {
      onSuccess: () => setSelectedConditionId(''),
    });
  };

  const isLoading = isCatalogLoading || isMyLoading;
  const isError = isCatalogError || isMyError;

  return (
    <Card style={{ border: '1.5px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-accent-light)',
            color: 'var(--color-accent-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <HeartPulse size={18} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Reported Health Conditions</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Used to provide personalized dietary guidance.
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading conditions..." size={20} />
      ) : isError ? (
        <div style={{ color: 'var(--color-danger)' }}><p>{catalogError?.message || myError?.message || 'Could not load health conditions.'}</p><Button variant="secondary" size="sm" onClick={() => { void refetchCatalog(); void refetchMine(); }} style={{ marginTop: 8 }}>Try again</Button></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Active Conditions Chips */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Your Active Conditions ({myConditions.length})
            </label>
            {myConditions.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                No health conditions reported. Add conditions below to tailor your targets.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {myConditions.map((mc) => (
                  <div
                    key={mc.condition.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-primary-light)',
                      color: 'var(--color-primary-shadow)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                    }}
                  >
                    <span>{mc.condition.name}</span>
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(mc.condition.id)}
                      disabled={removeMutation.isPending}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary-shadow)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Condition Selector */}
          {unselectedConditions.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-end',
                paddingTop: 'var(--space-sm)',
                borderTop: '1px solid var(--border-light)',
              }}
            >
              <div style={{ flex: 1 }}>
                <Select
                  label="Add Another Condition"
                  value={selectedConditionId}
                  onChange={(e) => setSelectedConditionId(e.target.value)}
                  options={[
                    { value: '', label: 'Select a condition to add...' },
                    ...unselectedConditions.map((c) => ({
                      value: c.id,
                      label: c.name,
                    })),
                  ]}
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={handleAdd}
                disabled={!selectedConditionId || addMutation.isPending}
                isLoading={addMutation.isPending}
                leftIcon={<Plus size={16} />}
              >
                Add
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
