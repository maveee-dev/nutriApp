import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleAlert, Info, ListChecks } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { format } from 'date-fns';
import { useDailyNutrition } from '@/features/dashboard/hooks/useDailyNutrition';
import { useProfile, useMyConditions, useDialysisStatus, useLabResults } from '../hooks/useHealth';
import { buildProfileCompletionItems, type ProfileCompletionItem } from '../utils/profileCompletion';

const statusLabel = (status: ProfileCompletionItem['status']): string => {
  if (status === 'complete') return 'Complete';
  if (status === 'attention') return 'Needs attention';
  return 'Review when relevant';
};

export interface ProfileCompletionSummaryProps {
  compact?: boolean;
  maxActions?: number;
}

export const ProfileCompletionSummary: React.FC<ProfileCompletionSummaryProps> = ({ compact = false, maxActions = 3 }) => {
  const profile = useProfile();
  const conditions = useMyConditions();
  const dialysis = useDialysisStatus();
  const labs = useLabResults();
  const daily = useDailyNutrition(format(new Date(), 'yyyy-MM-dd'));

  const isLoading = profile.isLoading || conditions.isLoading || dialysis.isLoading || labs.isLoading || daily.isLoading;
  if (isLoading) {
    return (
      <Card aria-label="Profile completion summary">
        <LoadingSpinner label="Checking your profile setup..." size={20} />
      </Card>
    );
  }

  const items = buildProfileCompletionItems({
    profile: profile.data ?? null,
    conditionCount: conditions.data?.items.length ?? 0,
    dialysisStatus: dialysis.data ?? null,
    laboratoryResults: labs.data ?? [],
    deferredPolicies: daily.data?.deferredPolicies ?? [],
  });
  const coreItems = items.filter((item) => ['age', 'sex', 'height', 'weight'].includes(item.id));
  const completedCoreItems = coreItems.filter((item) => item.status === 'complete').length;
  const attentionCount = items.filter((item) => item.status === 'attention').length;
  const actionableItems = items.filter((item) => item.status === 'attention' && item.action);

  if (compact) {
    const visibleActions = actionableItems.slice(0, maxActions);
    return (
      <Card aria-live="polite" aria-label="Profile next steps">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <ListChecks size={20} color={attentionCount > 0 ? 'var(--color-clinical)' : 'var(--color-primary)'} aria-hidden />
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Your next steps</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.45 }}>
              {attentionCount > 0 ? 'A few details can make your guidance more personal.' : 'Your profile is ready for the guidance currently available.'}
            </p>
          </div>
        </div>
        {visibleActions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: 'var(--space-sm)' }}>
            {visibleActions.map((item) => (
              <Link key={item.id} to={item.action!.to} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>
                {item.action!.label}
                <ArrowRight size={15} color="var(--color-primary)" aria-hidden />
              </Link>
            ))}
            {actionableItems.length > visibleActions.length && (
              <Link to="/health" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                View all profile items
              </Link>
            )}
          </div>
        ) : (
          <Link to="/health" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: 'var(--space-sm)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            Review your health profile <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </Card>
    );
  }

  return (
    <Card aria-live="polite" aria-label="Profile completion summary">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: attentionCount > 0 ? 'var(--color-clinical-light)' : 'var(--color-primary-light)',
            color: attentionCount > 0 ? 'var(--color-clinical)' : 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ListChecks size={19} aria-hidden />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Profile setup</h2>
            <Badge variant={attentionCount > 0 ? 'warning' : 'success'} size="sm">
              {completedCoreItems} of {coreItems.length} core details complete
            </Badge>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
            {attentionCount > 0
              ? 'Complete the items below to make your nutrition guidance more personal.'
              : 'Your core profile is ready. Review the additional context when it applies to you.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-md)' }}>
        {items.map((item) => {
          const Icon = item.status === 'complete' ? CheckCircle2 : item.status === 'attention' ? CircleAlert : Info;
          const color = item.status === 'complete'
            ? 'var(--color-primary)'
            : item.status === 'attention'
              ? 'var(--color-clinical)'
              : 'var(--text-muted)';

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-secondary)',
              }}
            >
              <Icon size={18} color={color} aria-hidden style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.875rem' }}>{item.label}</strong>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{statusLabel(item.status)}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.45 }}>
                  {item.detail}
                </p>
                {item.action && (
                  <Link
                    to={item.action.to}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.78rem', fontWeight: 700 }}
                  >
                    {item.action.label} <ArrowRight size={13} aria-hidden />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
