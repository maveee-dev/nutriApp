import React from 'react';
import { AlertCircle, CheckCircle2, Info, Lightbulb, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { RecommendationItem, RecommendationResolution } from '../types/dashboard.types';

interface DailyCoachingCardProps {
  resolution?: RecommendationResolution;
  isLoading?: boolean;
  error?: Error | null;
}

const toneByCategory: Record<string, { color: string; background: string; icon: React.ReactNode }> = {
  positive: { color: 'var(--color-primary-shadow)', background: 'var(--color-primary-light)', icon: <CheckCircle2 size={18} /> },
  caution: { color: 'var(--color-danger-shadow)', background: 'var(--color-danger-light)', icon: <AlertCircle size={18} /> },
  improvement: { color: 'var(--color-accent-shadow)', background: 'var(--color-accent-light)', icon: <Lightbulb size={18} /> },
  'deferred-policy': { color: 'var(--color-clinical)', background: 'var(--color-clinical-light)', icon: <Info size={18} /> },
};

export const DailyCoachingCard: React.FC<DailyCoachingCardProps> = ({ resolution, isLoading = false, error }) => {
  if (isLoading) {
    return <Card><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Finding a helpful next step…</p></Card>;
  }

  if (error) {
    return <Card><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Your coaching tips are taking a moment to catch up.</p></Card>;
  }

  if (!resolution || resolution.recommendations.length === 0) {
    return <Card><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No new coaching tip yet. Keep logging your meals and we’ll look for a helpful next step.</p></Card>;
  }

  return (
    <Card style={{ border: '1.5px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)' }}>
        <span style={{ width: '32px', height: '32px', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', color: 'var(--color-primary-shadow)', backgroundColor: 'var(--color-primary-light)' }}><Sparkles size={18} /></span>
        <div>
          <span style={{ color: 'var(--color-primary)', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your next step</span>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 750, marginTop: '2px' }}>A little guidance for today</h2>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {resolution.recommendations.slice(0, 2).map((recommendation) => <CoachingItem key={recommendation.id} recommendation={recommendation} />)}
      </div>
    </Card>
  );
};

const CoachingItem: React.FC<{ recommendation: RecommendationItem }> = ({ recommendation }) => {
  const tone = toneByCategory[recommendation.category] ?? { color: 'var(--color-info)', background: 'var(--color-info-light)', icon: <Info size={18} /> };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-secondary)' }}>
      <span style={{ width: '30px', height: '30px', flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', color: tone.color, backgroundColor: tone.background }}>{tone.icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 750 }}>{recommendation.title}</h3>
          <span style={{ color: tone.color, fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>{recommendation.category}</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.5, marginTop: '4px' }}>{recommendation.message}</p>
        {recommendation.actions?.[0] && <p style={{ color: tone.color, fontSize: '0.78rem', fontWeight: 700, marginTop: '8px' }}>{recommendation.actions[0]}</p>}
        <details style={{ marginTop: '8px' }}>
          <summary style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>Why am I seeing this?</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: 1.45 }}>
            <span>{recommendation.policy.source ?? 'Based on your approved nutrition guidance'} · {recommendation.policy.version}</span>
            {recommendation.evidence.map((evidence) => <span key={evidence.id}>{evidence.explanation}</span>)}
          </div>
        </details>
      </div>
    </div>
  );
};
