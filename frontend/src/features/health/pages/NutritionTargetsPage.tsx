import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { NutritionTargetsSection } from '../components/NutritionTargetsSection';

export const NutritionTargetsPage: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
    <PageHeader title="Nutrition Targets" subtitle="Review the nutrition targets currently recorded for your profile." />
    <Link to="/health" style={{ textDecoration: 'none', width: 'fit-content' }}><Button type="button" variant="ghost">Back to Health Profile</Button></Link>
    <NutritionTargetsSection />
  </div>
);
