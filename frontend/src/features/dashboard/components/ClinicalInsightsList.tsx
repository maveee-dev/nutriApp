import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { NutritionInsight } from '../types/dashboard.types';

export interface ClinicalInsightsListProps {
  insights: NutritionInsight[];
}

const friendlyInsightLabel = (ruleId: string, nutrient?: string): string => {
  const value = `${ruleId} ${nutrient ?? ''}`.toLowerCase();
  if (value.includes('sodium')) return 'Sodium needs attention';
  if (value.includes('potassium')) return 'Potassium needs attention';
  if (value.includes('saturated')) return 'Saturated fat needs attention';
  if (value.includes('added-sugar')) return 'Added sugar needs attention';
  if (value.includes('cholesterol')) return 'Cholesterol needs attention';
  return 'Nutrition guidance';
};

const severityLabel = (severity: string): string => {
  const value = severity.toLowerCase();
  if (value.includes('high') || value.includes('warning') || value.includes('alert') || value.includes('excess')) return 'Review this';
  if (value.includes('good') || value.includes('optimal') || value.includes('within')) return 'On track';
  return 'Information';
};

export const ClinicalInsightsList: React.FC<ClinicalInsightsListProps> = ({ insights }) => {
  if (!insights || insights.length === 0) {
    return null;
  }

  const getSeverityBadge = (severity: string): { variant: BadgeVariant; icon: React.ReactNode } => {
    const s = severity.toLowerCase();
    if (s.includes('high') || s.includes('warning') || s.includes('alert') || s.includes('excess')) {
      return { variant: 'danger', icon: <AlertTriangle size={13} /> };
    }
    if (s.includes('moderate') || s.includes('caution')) {
      return { variant: 'warning', icon: <AlertTriangle size={13} /> };
    }
    if (s.includes('good') || s.includes('optimal') || s.includes('within')) {
      return { variant: 'success', icon: <CheckCircle2 size={13} /> };
    }
    return { variant: 'info', icon: <Info size={13} /> };
  };

  return (
    <Card style={{ border: '1.5px solid var(--border-light)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: 'var(--space-md)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-info-light)',
            color: 'var(--color-info-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Info size={18} />
        </div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Nutrition notes</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {insights.map((insight, idx) => {
          const { variant, icon } = getSeverityBadge(insight.severity);

          return (
            <div
              key={`${insight.ruleId}-${idx}`}
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-secondary)',
                borderLeft: `4px solid ${
                  variant === 'danger'
                    ? 'var(--color-danger)'
                    : variant === 'warning'
                    ? 'var(--color-accent)'
                    : 'var(--color-primary)'
                }`,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {friendlyInsightLabel(insight.ruleId)}
                </span>
                <Badge variant={variant} size="sm" icon={icon}>
                  {severityLabel(insight.severity)}
                </Badge>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {insight.explanation}
              </p>

              {(insight.measuredValue || insight.targetValue) && (
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {insight.measuredValue && <span>Measured: {insight.measuredValue}</span>}
                  {insight.targetValue && <span>Target: {insight.targetValue}</span>}
                </div>
              )}

              <details style={{ marginTop: '2px' }}>
                <summary style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>Why this may matter</summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '5px', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  <span>This note uses the health and nutrition information saved in your profile.</span>
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
