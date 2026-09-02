import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useDialysisStatus, useUpdateDialysisMutation } from '../hooks/useHealth';
import { Activity, Check } from 'lucide-react';
import type { DialysisModality, DialysisStatus, SelectableDialysisModality } from '../types/health.types';
import { format } from 'date-fns';

export const DialysisSection: React.FC = () => {
  const { data: dialysis, isLoading, isError, error, refetch } = useDialysisStatus();
  const updateMutation = useUpdateDialysisMutation();

  const [status, setStatus] = useState<DialysisStatus | ''>('');
  const [modality, setModality] = useState<SelectableDialysisModality | ''>('');
  const [effectiveAt, setEffectiveAt] = useState<string>('');
  const [frequency, setFrequency] = useState<string>('');
  const [schedule, setSchedule] = useState<string>('');
  const [savedFrequency, setSavedFrequency] = useState<string | null>(null);
  const [savedSchedule, setSavedSchedule] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | undefined>();

  useEffect(() => {
    if (dialysis == null) {
      setStatus('');
      setModality('');
      setEffectiveAt('');
      setFrequency('');
      setSchedule('');
      setSavedFrequency(null);
      setSavedSchedule(null);
      setValidationError(undefined);
      return;
    }

    setStatus(dialysis.status);
    setModality(isSelectableModality(dialysis.modality) ? dialysis.modality : '');
    if (dialysis.effectiveAt) {
      try {
        setEffectiveAt(format(new Date(dialysis.effectiveAt), 'yyyy-MM-dd'));
      } catch {
        setEffectiveAt('');
      }
    } else {
      setEffectiveAt('');
    }
    setFrequency(dialysis.frequency ?? '');
    setSchedule(dialysis.schedule ?? '');
    setSavedFrequency(dialysis.frequency);
    setSavedSchedule(dialysis.schedule);
  }, [dialysis]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === '') {
      setValidationError('Choose whether you are on dialysis before saving.');
      return;
    }
    if (status === 'ACTIVE' && modality === '') {
      setValidationError('Please confirm your dialysis type before saving.');
      return;
    }

    setValidationError(undefined);
    updateMutation.mutate({
      status,
      ...(status === 'ACTIVE' && modality !== '' ? { modality } : {}),
      // null explicitly clears a previously stored start date; undefined is
      // reserved for callers that intentionally omit the optional field.
      effectiveAt: effectiveAt ? new Date(effectiveAt).toISOString() : null,
      ...((status === 'ACTIVE' && (frequency.trim() || savedFrequency != null)) || (status !== 'ACTIVE' && savedFrequency != null) ? { frequency: status === 'ACTIVE' ? frequency.trim() || null : null } : {}),
      ...((status === 'ACTIVE' && (schedule.trim() || savedSchedule != null)) || (status !== 'ACTIVE' && savedSchedule != null) ? { schedule: status === 'ACTIVE' ? schedule.trim() || null : null } : {}),
    });
  };

  const handleStatusChange = (nextStatus: DialysisStatus | '') => {
    setStatus(nextStatus);
    setValidationError(undefined);
    if (nextStatus !== 'ACTIVE') {
      setModality('');
      setEffectiveAt('');
      setFrequency('');
      setSchedule('');
    }
  };

  const handleModalityChange = (nextModality: SelectableDialysisModality | '') => {
    setModality(nextModality);
    setValidationError(undefined);
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
        <Select
          id="current-dialysis-status"
          label="Current Dialysis Status"
          value={status}
          onChange={(event) => handleStatusChange(event.target.value as DialysisStatus | '')}
          options={[
            { value: '', label: 'Select your current status' },
            { value: 'INACTIVE', label: 'Not on dialysis' },
            { value: 'ACTIVE', label: 'Active dialysis treatment' },
          ]}
          error={status === '' ? validationError : undefined}
        />

        {status === 'ACTIVE' && (
          <>
            <Select
              id="dialysis-modality"
              label="Dialysis Type"
              value={modality}
              onChange={(event) => handleModalityChange(event.target.value as SelectableDialysisModality | '')}
              options={[
                { value: '', label: 'Please confirm your dialysis type' },
                { value: 'HEMODIALYSIS', label: 'Hemodialysis' },
                { value: 'PERITONEAL_DIALYSIS', label: 'Peritoneal Dialysis' },
              ]}
              helperText={modality === '' ? 'This helps NutriApp apply the correct treatment-specific guidance.' : undefined}
              error={modality === '' ? validationError : undefined}
            />
            <Input
              label="Dialysis start date (optional)"
              type="date"
              value={effectiveAt}
              onChange={(e) => setEffectiveAt(e.target.value)}
              helperText="When did you begin dialysis treatment?"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
              <Input label="Frequency (optional)" value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="e.g. 3 times per week" />
              <Input label="Schedule (optional)" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="e.g. Monday, Wednesday, Friday" />
            </div>
          </>
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

function isSelectableModality(modality: DialysisModality): modality is SelectableDialysisModality {
  return modality === 'HEMODIALYSIS' || modality === 'PERITONEAL_DIALYSIS';
}
