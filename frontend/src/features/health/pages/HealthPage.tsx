import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProfileFormSection } from '../components/ProfileFormSection';
import { ConditionsSection } from '../components/ConditionsSection';
import { DialysisSection } from '../components/DialysisSection';
import { LabResultsSection } from '../components/LabResultsSection';
import { ProfileCompletionSummary } from '../components/ProfileCompletionSummary';

export const HealthPage: React.FC = () => {
  const location = useLocation();
  const requestedLab = new URLSearchParams(location.search).get('addLab');
  const initialLabTestCode = requestedLab === 'egfr' || requestedLab === 'potassium' || requestedLab === 'phosphorus'
    ? requestedLab
    : undefined;

  useEffect(() => {
    const sectionId = location.hash.replace(/^#/, '');
    if (!sectionId) return;

    const frame = window.requestAnimationFrame(() => {
      const section = document.getElementById(sectionId);
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  const sectionStyle: React.CSSProperties = {
    scrollMarginTop: 'var(--space-lg)',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader
        title="Health Profile & Clinical Context"
        subtitle="Manage your physical metrics, reported health conditions, and laboratory records."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <ProfileCompletionSummary />
        <section id="physical-metrics" tabIndex={-1} style={sectionStyle} aria-label="Physical metrics">
          <ProfileFormSection />
        </section>
        <section id="health-conditions" tabIndex={-1} style={sectionStyle} aria-label="Reported health conditions">
          <ConditionsSection />
        </section>
        <section id="dialysis-status" tabIndex={-1} style={sectionStyle} aria-label="Dialysis treatment status">
          <DialysisSection />
        </section>
        <section id="laboratory-results" tabIndex={-1} style={sectionStyle} aria-label="Laboratory results">
          <LabResultsSection initialAddTestCode={initialLabTestCode} />
        </section>
      </div>
    </div>
  );
};
