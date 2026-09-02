import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useCreateNutritionTargetMutation, useNutritionTargets, useUpdateNutritionTargetMutation } from '../hooks/useHealth';
import type { NutritionTarget, NutritionTargetKind, NutritionTargetSource } from '../types/health.types';
import { CalendarRange, Check, Pencil, Target } from 'lucide-react';

const nutrients = [
  ['sodiumMilligrams', 'Sodium', 'mg/day'], ['proteinGrams', 'Protein', 'g/day'], ['carbohydrateGrams', 'Carbohydrates', 'g/day'],
  ['potassiumMilligrams', 'Potassium', 'mg/day'], ['phosphorusMilligrams', 'Phosphorus', 'mg/day'], ['fiberGrams', 'Fiber', 'g/day'],
  ['saturatedFatGrams', 'Saturated fat', 'g/day'], ['addedSugarGrams', 'Added sugar', 'g/day'], ['cholesterolMilligrams', 'Cholesterol', 'mg/day'], ['caloriesKcal', 'Calories', 'kcal/day'],
] as const;

const today = () => new Date().toISOString().slice(0, 10);

export const NutritionTargetsSection: React.FC = () => {
  const { data: targets, isLoading, isError, error, refetch } = useNutritionTargets();
  const createMutation = useCreateNutritionTargetMutation();
  const updateMutation = useUpdateNutritionTargetMutation();
  const [editing, setEditing] = useState<NutritionTarget | null>(null);
  const [nutrient, setNutrient] = useState('sodiumMilligrams');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('mg/day');
  const [kind, setKind] = useState<NutritionTargetKind>('UPPER_LIMIT');
  const [source, setSource] = useState<NutritionTargetSource>('USER');
  const [approvalStatus, setApprovalStatus] = useState<'SUGGESTED' | 'APPROVED' | 'DISMISSED'>('APPROVED');
  const [effectiveAt, setEffectiveAt] = useState(today());
  const [expirationAt, setExpirationAt] = useState('');
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');
  const [notes, setNotes] = useState('');

  const isPending = createMutation.isPending || updateMutation.isPending;
  const selectedUnit = useMemo(() => nutrients.find(([key]) => key === nutrient)?.[2] ?? unit, [nutrient, unit]);

  const reset = () => {
    setEditing(null); setNutrient('sodiumMilligrams'); setValue(''); setUnit('mg/day'); setKind('UPPER_LIMIT'); setSource('USER'); setApprovalStatus('APPROVED'); setEffectiveAt(today()); setExpirationAt(''); setRangeMin(''); setRangeMax(''); setNotes('');
  };

  const beginEdit = (target: NutritionTarget) => {
    setEditing(target); setNutrient(target.nutrient); setValue(target.value ?? ''); setUnit(target.unit); setKind(target.kind); setSource(target.source); setApprovalStatus(target.approvalStatus === 'EXPIRED' ? 'APPROVED' : target.approvalStatus); setEffectiveAt(target.effectiveAt.slice(0, 10)); setExpirationAt(target.expirationAt?.slice(0, 10) ?? ''); setRangeMin(target.rangeMin ?? ''); setRangeMax(target.rangeMax ?? ''); setNotes(target.notes ?? '');
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { value: kind === 'RANGE' ? undefined : value, unit: selectedUnit, kind, source, approvalStatus, effectiveAt: new Date(effectiveAt).toISOString(), expirationAt: expirationAt ? new Date(expirationAt).toISOString() : null, notes: notes || null, rangeMin: kind === 'RANGE' ? rangeMin : null, rangeMax: kind === 'RANGE' ? rangeMax : null };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload }, { onSuccess: reset });
    else createMutation.mutate({ nutrient, ...payload }, { onSuccess: reset });
  };

  if (isLoading) return <LoadingSpinner label="Loading nutrition targets..." size={20} />;
  if (isError) return <Card><p style={{ color: 'var(--color-danger)' }}>{error?.message || 'Could not load nutrition targets.'}</p><Button variant="secondary" size="sm" onClick={() => void refetch()} style={{ marginTop: 8 }}>Try again</Button></Card>;

  return (
    <Card style={{ border: '1.5px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-sm)' }}><Target size={19} color="var(--color-primary)" /><div><h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Nutrition Targets</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Targets are versioned. Only approved numeric upper or lower targets can affect personalized evaluation.</p></div></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 'var(--space-lg)' }}>
        {(targets ?? []).length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No nutrition targets recorded.</p> : (targets ?? []).map((target) => <div key={target.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><div><strong>{nutrients.find(([key]) => key === target.nutrient)?.[1] ?? target.nutrient}</strong><div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>{target.kind === 'RANGE' ? `${target.rangeMin}–${target.rangeMax}` : target.value} {target.unit} · {target.approvalStatus.toLowerCase()} · {target.source.toLowerCase().replace('_', ' ')}</div><div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: 2 }}>Effective {new Date(target.effectiveAt).toLocaleDateString()}{target.expirationAt ? ` · Expires ${new Date(target.expirationAt).toLocaleDateString()}` : ''}</div></div><Button type="button" variant="ghost" size="sm" onClick={() => beginEdit(target)} leftIcon={<Pencil size={14} />}>Edit</Button></div>)}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-light)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{editing ? 'Create target version' : 'Add nutrition target'}</h3>
        {!editing && <Select label="Nutrient" value={nutrient} onChange={(event) => { const next = event.target.value; setNutrient(next); setUnit(nutrients.find(([key]) => key === next)?.[2] ?? 'mg/day'); }} options={nutrients.map(([key, label]) => ({ value: key, label }))} />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--space-md)' }}>
          <Select label="Target kind" value={kind} onChange={(event) => setKind(event.target.value as NutritionTargetKind)} options={[{ value: 'UPPER_LIMIT', label: 'Upper limit' }, { value: 'LOWER_TARGET', label: 'Lower target' }, { value: 'RANGE', label: 'Range' }]} />
          {kind === 'RANGE' ? <><Input label="Minimum" value={rangeMin} onChange={(event) => setRangeMin(event.target.value)} inputMode="decimal" placeholder="e.g. 60" /><Input label="Maximum" value={rangeMax} onChange={(event) => setRangeMax(event.target.value)} inputMode="decimal" placeholder="e.g. 90" /></> : <Input label="Value" value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" placeholder="e.g. 2000" />}
          <Input label="Unit" value={selectedUnit} readOnly helperText="Validated for the selected nutrient." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--space-md)' }}><Select label="Source" value={source} onChange={(event) => setSource(event.target.value as NutritionTargetSource)} options={[{ value: 'USER', label: 'User' }, { value: 'CLINICIAN', label: 'Clinician' }, { value: 'SYSTEM_SUGGESTED', label: 'System suggested' }, { value: 'IMPORTED', label: 'Imported' }]} /><Select label="Status" value={approvalStatus} onChange={(event) => setApprovalStatus(event.target.value as typeof approvalStatus)} options={[{ value: 'APPROVED', label: 'Approved' }, { value: 'SUGGESTED', label: 'Suggested' }, { value: 'DISMISSED', label: 'Dismissed' }]} /><Input label="Effective date" type="date" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} /><Input label="Expiration (optional)" type="date" value={expirationAt} onChange={(event) => setExpirationAt(event.target.value)} /></div>
        <Input label="Notes (optional)" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add context for this target" />
        {(createMutation.isError || updateMutation.isError) && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{((createMutation.error || updateMutation.error) as Error).message}</p>}
        <div style={{ display: 'flex', gap: 8 }}><Button type="submit" isLoading={isPending} disabled={kind === 'RANGE' ? !rangeMin || !rangeMax : !value} leftIcon={editing ? <Check size={16} /> : <CalendarRange size={16} />}>{editing ? 'Save new version' : 'Save target'}</Button>{editing && <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>}</div>
      </form>
    </Card>
  );
};
