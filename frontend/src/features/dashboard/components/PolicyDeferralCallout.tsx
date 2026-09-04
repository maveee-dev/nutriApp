import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { NutritionPolicyDeferral } from '../types/dashboard.types';
import { deferralGuidance } from '../utils/deferralGuidance';

export interface PolicyDeferralCalloutProps {
  deferredPolicies: NutritionPolicyDeferral[];
}

const friendlyPolicyLabel = (policyId: string): string => {
  const value = policyId.toLowerCase();
  if (value.includes('ckd') || value.includes('dialysis')) return 'Kidney nutrition guidance';
  if (value.includes('diabetes') || value.includes('carbohydrate')) return 'Diabetes carbohydrate guidance';
  if (value.includes('cardiovascular') || value.includes('hypertension')) return 'Heart-health guidance';
  return 'Personalized nutrition guidance';
};

export const PolicyDeferralCallout: React.FC<PolicyDeferralCalloutProps> = ({ deferredPolicies }) => {
  if (!deferredPolicies || deferredPolicies.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {deferredPolicies.map((deferral) => {
        const guidance = deferralGuidance(deferral);

        return (
          <Card
            key={`${deferral.policyId}-${deferral.reason}`}
            style={{
              backgroundColor: 'var(--color-clinical-subtle)',
              border: '1.5px solid var(--color-clinical-light)',
              padding: 'var(--space-md) var(--space-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-clinical-light)',
                  color: 'var(--color-clinical)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <Sparkles size={18} aria-hidden />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-clinical-hover)' }}>
                    {friendlyPolicyLabel(deferral.policyId)}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'var(--color-clinical-light)',
                      color: 'var(--color-clinical)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    Needs a little more information
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.45 }}>
                  {guidance.supportingText ?? deferral.explanation}
                </p>

                <details style={{ marginTop: '6px' }}>
                  <summary style={{ color: 'var(--color-clinical)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                    Why am I seeing this?
                  </summary>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1.45, marginTop: '4px' }}>
                    NutriApp needs this information before it can personalize this part of your guidance.
                  </p>
                </details>

                {guidance.action && (
                  <div style={{ marginTop: 'var(--space-xs)' }}>
                    <Link
                      to={guidance.action.to}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: 'var(--color-clinical)',
                      }}
                    >
                      {guidance.action.label} <ArrowRight size={14} aria-hidden />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
