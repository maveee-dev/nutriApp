import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AddLabResultModal, type SupportedLabTestCode } from './AddLabResultModal';
import { useLabResults } from '../hooks/useHealth';
import { useDailyNutrition } from '@/features/dashboard/hooks/useDailyNutrition';
import { FlaskConical, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface LabResultsSectionProps {
  initialAddTestCode?: SupportedLabTestCode;
}

const MISSING_LAB_REASONS = new Set(['missing-egfr', 'missing-potassium', 'missing-phosphorus']);

export const LabResultsSection: React.FC<LabResultsSectionProps> = ({ initialAddTestCode }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(initialAddTestCode != null);
  const { data: results, isLoading, isError, error, refetch } = useLabResults();
  const { data: dailyNutrition } = useDailyNutrition(format(new Date(), 'yyyy-MM-dd'));

  const labList = [...(results || [])].sort(
    (left, right) => new Date(right.collectedAt).getTime() - new Date(left.collectedAt).getTime(),
  );
  const hasMissingEvidence = (dailyNutrition?.deferredPolicies ?? []).some((policy) => MISSING_LAB_REASONS.has(policy.reason));

  useEffect(() => {
    if (initialAddTestCode) setIsAddModalOpen(true);
  }, [initialAddTestCode]);

  return (
    <Card style={{ border: '1.5px solid var(--border-light)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-md)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <FlaskConical size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Laboratory Results</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Your recent results can help tailor the nutrition guidance that applies to you.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<Plus size={16} />}
        >
          Add Lab Result
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading lab records..." size={20} />
      ) : isError ? (
        <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-danger)' }}><p>{error?.message || 'Could not load laboratory results.'}</p><Button variant="secondary" size="sm" onClick={() => void refetch()} style={{ marginTop: 8 }}>Try again</Button></div>
      ) : labList.length === 0 ? (
        <div
          style={{
            padding: 'var(--space-lg)',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface-secondary)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {hasMissingEvidence
              ? 'Some personalized guidance is waiting for a laboratory result. Add the requested result to continue.'
              : 'No laboratory results recorded yet. Add a result when it is needed for personalized guidance.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {labList.map((res) => {
            const numVal = parseFloat(res.value);
            const refLow = res.referenceLow ? parseFloat(res.referenceLow) : null;
            const isBelowNormal = refLow !== null && numVal < refLow;
            const policyUsage = (dailyNutrition?.targetProvenance ?? []).filter((provenance) => {
              const laboratory = provenance.applicability?.laboratory;
              return laboratory?.testCode === res.testCode && laboratory.collectedAt === res.collectedAt;
            });
            const hasStaleEvidence = (dailyNutrition?.deferredPolicies ?? []).some((policy) => policy.reason === `stale-${res.testCode}`);
            const evidenceStatus = policyUsage.length > 0 ? 'current' : hasStaleEvidence ? 'stale' : 'recorded';

            let formattedDate = res.collectedAt;
            try {
              formattedDate = format(parseISO(res.collectedAt), 'MMM d, yyyy');
            } catch {}

            return (
              <div
                key={res.id}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', textTransform: 'uppercase' }}>
                      {res.testCode}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Collected: {formattedDate} · Manual entry
                    </span>
                  </div>

                  {res.referenceLow && (
                    <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Reference range starts at {res.referenceLow} {res.unit}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {res.value}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                      {res.unit}
                    </span>
                  </div>

                  {evidenceStatus === 'stale' ? (
                    <Badge variant="warning" size="sm" icon={<AlertTriangle size={12} />}>
                      Needs a newer result
                    </Badge>
                  ) : evidenceStatus === 'current' ? (
                    <Badge variant="clinical" size="sm" icon={<CheckCircle2 size={12} />}>
                      Used in current guidance
                    </Badge>
                  ) : isBelowNormal ? (
                    <Badge variant="warning" size="sm" icon={<AlertTriangle size={12} />}>
                      Below reference range
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm" icon={<CheckCircle2 size={12} />}>
                      Within reference range
                    </Badge>
                  )}
                </div>
                {evidenceStatus === 'current' && policyUsage.length > 0 && (
                  <details style={{ flexBasis: '100%', paddingTop: '2px' }}>
                    <summary style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>How this result is used</summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {policyUsage.map((provenance) => <span key={`${provenance.policyId}-${provenance.target}`}>{provenance.explanation} · Source: {provenance.source}</span>)}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddLabResultModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialTestCode={initialAddTestCode}
      />
    </Card>
  );
};
