import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useDialysisStatus, useUpdateDialysisMutation } from '../hooks/useHealth';
import { Activity, Check } from 'lucide-react';
import type { DialysisStatus } from '../types/health.types';
import { format } from 'date-fns';

export const DialysisSection: React.FC = () => {
  const { data: dialysis, isLoading, isError, error, refetch } = useDialysisStatus();
  const updateMutation = useUpdateDialysisMutation();

  const [status, setStatus] = useState<DialysisStatus>('INACTIVE');
  const [effectiveAt, setEffectiveAt] = useState<string>('');

  useEffect(() => {
    if (dialysis) {
      setStatus(dialysis.status);
      if (dialysis.effectiveAt) {
        try {
          setEffectiveAt(format(new Date(dialysis.effectiveAt), 'yyyy-MM-dd'));
        } catch {
          setEffectiveAt('');
        }
      }
    }
  }, [dialysis]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      status,
      effectiveAt: effectiveAt ? new Date(effectiveAt).toISOString() : undefined,
    });
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading treatment status..." size={20} />;
  }

  if (isError) {
    return <Card><p style={{ color: 'var(--color-danger)' }}>{error?.message || 'Could not load treatment status.'}</p><Button variant="secondary" size="sm" onClick={() => void refetch()} style={{ marginTop: 8 }}>Try again</Button></Card>;
  }

  return (
    <Card style={{ border: '1.5px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-clinical-light)',
            color: 'var(--color-clinical)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Activity size={18} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Dialysis Treatment Status</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Used to adjust clinical protein and mineral nutrition targets.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Current Dialysis Status
          </label>
          <SegmentedControl<DialysisStatus>
            value={status}
            onChange={setStatus}
            options={[
              { value: 'INACTIVE', label: 'Not on Dialysis' },
              { value: 'ACTIVE', label: 'Active Dialysis Treatment' },
            ]}
          />
        </div>

        {status === 'ACTIVE' && (
          <Input
            label="Effective Date (Optional)"
            type="date"
            value={effectiveAt}
            onChange={(e) => setEffectiveAt(e.target.value)}
            helperText="When did you begin dialysis treatment?"
          />
        )}

        <Button
          type="submit"
          variant="primary"
          isLoading={updateMutation.isPending}
          leftIcon={<Check size={18} />}
          style={{ width: 'fit-content' }}
        >
          Update Dialysis Status
        </Button>
      </form>
    </Card>
  );
};
