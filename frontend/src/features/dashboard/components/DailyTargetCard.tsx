import React from 'react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { Target, CheckCircle2, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import type { DiabetesCarbohydrateAdherence, NutritionTargetProvenance, NutritionTargets, NutritionTotal } from '../types/dashboard.types';

export interface DailyTargetCardProps {
  targets: NutritionTargets;
  totals: NutritionTotal[];
  targetProvenance?: NutritionTargetProvenance[];
  diabetesCarbohydrateAdherence?: DiabetesCarbohydrateAdherence;
  deferredPolicies?: { policyId: string; reason: string; explanation: string }[];
  evaluationMode?: 'current-recomputation' | 'historical-replay';
  policySetFingerprints?: string[];
}

export const DailyTargetCard: React.FC<DailyTargetCardProps> = ({ targets, totals, targetProvenance = [], diabetesCarbohydrateAdherence, deferredPolicies = [], evaluationMode, policySetFingerprints = [] }) => {
  const provenanceTargets = new Set(targetProvenance.map(({ target }) => target));
  const hasDailyCarbohydrateAdherence = diabetesCarbohydrateAdherence?.status === 'available' && diabetesCarbohydrateAdherence.targetCarbohydrateGrams != null && diabetesCarbohydrateAdherence.consumedCarbohydrateGrams != null;
  const definitions = [
    { key: 'sodiumMilligrams', label: 'Sodium', unit: 'mg', names: ['sodium'], priority: 100, meaning: 'upper-limit' as const, variant: 'dynamic' as const },
    { key: 'carbohydrateGrams', label: 'Carbohydrates', unit: 'g', names: ['carbohydrate'], priority: 95, meaning: 'adequacy-target' as const, variant: 'accent' as const },
    { key: 'proteinGrams', label: 'Protein', unit: 'g', names: ['protein'], priority: 90, meaning: 'adequacy-target' as const, variant: 'accent' as const },
    { key: 'saturatedFatGrams', label: 'Saturated fat', unit: 'g', names: ['saturated fat', 'saturated-fat'], priority: 85, meaning: 'upper-limit' as const, variant: 'dynamic' as const },
  ];
  const goals = definitions
    .filter((definition) => !(definition.key === 'carbohydrateGrams' && hasDailyCarbohydrateAdherence))
    .map((definition) => {
      const targetValue = targets[definition.key as keyof NutritionTargets];
      const target = typeof targetValue === 'string' ? Number.parseFloat(targetValue) : Number.NaN;
      const active = Number.isFinite(target) && (definition.key === 'sodiumMilligrams' || provenanceTargets.has(definition.key));
      if (!active) return null;
      const total = definition.key === 'carbohydrateGrams' && diabetesCarbohydrateAdherence?.status === 'available'
        ? diabetesCarbohydrateAdherence.consumedCarbohydrateGrams
        : totals.find((item) => definition.names.some((name) => item.name.toLowerCase().includes(name)))?.amount;
      const current = total == null ? 0 : Number.parseFloat(total);
      return { ...definition, target, current: Number.isFinite(current) ? current : 0 };
    })
    .filter((goal): goal is NonNullable<typeof goal> => goal != null)
    .sort((left, right) => right.priority - left.priority);
  const hasExceededLimit = goals.some((goal) => goal.meaning === 'upper-limit' && goal.current > goal.target);
  const nearLimit = goals.some((goal) => goal.meaning === 'upper-limit' && goal.current / goal.target >= 0.8);

  return (
    <Card style={{ border: '1.5px solid var(--border-light)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary-shadow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Target size={18} />
          </div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Today’s goals</h2>
      </div>

        {hasExceededLimit ? (
          <Badge variant="danger" icon={<AlertTriangle size={13} />}>
            Needs a little attention
          </Badge>
        ) : nearLimit ? (
          <Badge variant="warning" icon={<ShieldCheck size={13} />}>
            You’re getting close
          </Badge>
        ) : (
          <Badge variant="success" icon={<CheckCircle2 size={13} />}>
            On Track
          </Badge>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {hasDailyCarbohydrateAdherence && diabetesCarbohydrateAdherence && <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-secondary)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}><strong style={{ fontSize: '0.9rem' }}>Daily adherence</strong><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{diabetesCarbohydrateAdherence.coveragePercentage ?? 0}% snapshot coverage</span></div><p style={{ marginTop: 3, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Carbohydrates consumed against your individualized daily target.</p><div style={{ marginTop: 8 }}><ProgressBar value={Number.parseFloat(diabetesCarbohydrateAdherence.consumedCarbohydrateGrams ?? '0')} max={Number.parseFloat(diabetesCarbohydrateAdherence.targetCarbohydrateGrams ?? '0')} unit="g" meaning="adequacy-target" variant="accent" size="sm" showPercentage /></div><p style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{Number.parseFloat(diabetesCarbohydrateAdherence.exceededByGrams ?? '0') > 0 ? `${diabetesCarbohydrateAdherence.exceededByGrams} g above your daily target` : `${diabetesCarbohydrateAdherence.remainingCarbohydrateGrams ?? '0'} g remaining in today's target`}</p><details style={{ marginTop: 5 }}><summary style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>Why this progress?</summary><p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1.45, marginTop: 3 }}>{diabetesCarbohydrateAdherence.targetProvenance?.explanation ?? 'Based on your approved individualized carbohydrate target and immutable meal evaluation snapshots.'}</p></details></div>}
        {goals.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}><Info size={16} /> Goals will appear as approved targets become available.</div>
        ) : goals.map((goal) => {
          const over = goal.meaning === 'upper-limit' && goal.current > goal.target;
          const remaining = Math.abs(goal.target - goal.current);
          const provenance = targetProvenance.find((item) => item.target === goal.key);
          return <div key={goal.key}>
            <ProgressBar label={goal.label} value={Math.round(goal.current * 10) / 10} max={Math.round(goal.target * 10) / 10} unit={goal.unit} showPercentage variant={goal.variant} meaning={goal.meaning} size="md" />
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{goal.meaning === 'upper-limit' ? (over ? `${Math.round(remaining * 10) / 10} ${goal.unit} over your daily allowance` : `${Math.round(remaining * 10) / 10} ${goal.unit} remaining`) : (over ? 'Daily target reached' : `${Math.round(remaining * 10) / 10} ${goal.unit} to your daily target`)}</p>
            {provenance && <details style={{ marginTop: '6px' }}><summary style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>Why this goal?</summary><p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: 1.45, marginTop: '4px' }}>{provenance.explanation}</p></details>}
          </div>;
        })}
        {goals.length > 0 && deferredPolicies.length > 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{deferredPolicies.length} other goal{deferredPolicies.length === 1 ? '' : 's'} need more information before they can be shown.</p>}
        {(evaluationMode || policySetFingerprints.length > 0) && <details style={{ marginTop: '2px' }}><summary style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>About today’s evaluation</summary><p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: 1.45, marginTop: '4px' }}>{evaluationMode === 'historical-replay' ? 'This view is replayed from immutable meal evaluation snapshots.' : 'This view uses your current profile, approved policies, and logged meals.'}{policySetFingerprints.length > 0 ? ` Policy set: ${policySetFingerprints[0]}.` : ''}</p></details>}
      </div>
    </Card>
  );
};
