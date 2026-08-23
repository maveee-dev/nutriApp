import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, HeartPulse, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProfileFormSection } from '../components/ProfileFormSection';
import { ConditionsSection } from '../components/ConditionsSection';
import { DialysisSection } from '../components/DialysisSection';
import { LabResultsSection } from '../components/LabResultsSection';
import { useMyConditions, useDialysisStatus } from '../hooks/useHealth';

type OnboardingStepId = 'welcome' | 'profile' | 'conditions' | 'dialysis' | 'labs' | 'complete';

interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  optional?: boolean;
}

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const { data: conditions } = useMyConditions();
  const { data: dialysis } = useDialysisStatus();

  const showDialysisStep = useMemo(() => {
    const conditionNames = (conditions?.items ?? []).map((item) => item.condition.name).join(' ');
    return dialysis?.status === 'ACTIVE' || /ckd|kidney|dialysis/i.test(conditionNames);
  }, [conditions?.items, dialysis?.status]);

  const steps = useMemo<OnboardingStep[]>(() => {
    const base: OnboardingStep[] = [
      { id: 'welcome', label: 'Welcome' },
      { id: 'profile', label: 'Personal information' },
      { id: 'conditions', label: 'Health conditions' },
    ];
    if (showDialysisStep) base.push({ id: 'dialysis', label: 'Dialysis details', optional: true });
    base.push(
      { id: 'labs', label: 'Laboratory results', optional: true },
      { id: 'complete', label: 'Finish' },
    );
    return base;
  }, [showDialysisStep]);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isFirst = stepIndex === 0;
  const isLast = step.id === 'complete';

  const next = () => {
    if (isLast) {
      navigate('/');
      return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const previous = () => setStepIndex((current) => Math.max(current - 1, 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', maxWidth: '760px', margin: '0 auto', width: '100%' }}>
      <Card style={{ border: '1.5px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={20} aria-hidden />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              NutriApp setup
            </p>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '4px' }}>{step.label}</h1>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }} aria-label="Onboarding progress">
              {steps.map((item, index) => (
                <Badge key={item.id} variant={index === stepIndex ? 'info' : index < stepIndex ? 'success' : 'neutral'} size="sm">
                  {index + 1}. {item.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {step.id === 'welcome' && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <HeartPulse size={34} color="var(--color-primary)" aria-hidden />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Let’s make your guidance personal</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '6px' }}>
                We’ll walk through a few details that help NutriApp show more relevant goals, food evaluations, and reminders.
              </p>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              You can skip laboratory results if you do not have them available yet. You can update everything later from Health.
            </p>
          </div>
        </Card>
      )}

      {step.id === 'profile' && <ProfileFormSection />}
      {step.id === 'conditions' && <ConditionsSection />}
      {step.id === 'dialysis' && <DialysisSection />}
      {step.id === 'labs' && <LabResultsSection />}

      {step.id === 'complete' && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--space-md)', padding: 'var(--space-md) 0' }}>
            <CheckCircle2 size={48} color="var(--color-primary)" aria-hidden />
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>You’re ready to get started</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: '6px' }}>
                Your dashboard will guide you to any remaining information that could improve your personalized guidance.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
        <Button type="button" variant="secondary" onClick={previous} disabled={isFirst} leftIcon={<ArrowLeft size={16} />}>
          Back
        </Button>
        <Button type="button" variant="primary" onClick={next} rightIcon={<ArrowRight size={16} />}>
          {isLast ? 'Go to dashboard' : step.optional ? 'Continue or skip' : step.id === 'welcome' ? 'Start setup' : 'Save and continue'}
        </Button>
      </div>
    </div>
  );
};
