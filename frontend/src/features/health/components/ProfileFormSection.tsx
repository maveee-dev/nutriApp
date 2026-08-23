import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useProfile, useUpdateProfileMutation } from '../hooks/useHealth';
import { User, Check } from 'lucide-react';
import type { Sex, ActivityLevel } from '../types/health.types';

export const ProfileFormSection: React.FC = () => {
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const updateMutation = useUpdateProfileMutation();
  const isMissingProfile = isError && (error as Error & { status?: number })?.status === 404;

  const [age, setAge] = useState<string>('');
  const [sex, setSex] = useState<Sex | ''>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | ''>('');

  useEffect(() => {
    if (profile) {
      setAge(profile.age !== null ? String(profile.age) : '');
      setSex(profile.sex || '');
      setHeightCm(profile.heightCm !== null ? String(profile.heightCm) : '');
      setWeightKg(profile.weightKg !== null ? String(profile.weightKg) : '');
      setActivityLevel(profile.activityLevel || '');
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      age: age ? parseInt(age, 10) : undefined,
      sex: sex ? (sex as Sex) : undefined,
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      activityLevel: activityLevel ? (activityLevel as ActivityLevel) : undefined,
    });
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading health profile..." size={24} />;
  }

  if (isError && !isMissingProfile) {
    return <Card><p style={{ color: 'var(--color-danger)' }}>{error?.message || 'Could not load your health profile.'}</p><Button variant="secondary" size="sm" onClick={() => void refetch()} style={{ marginTop: 8 }}>Try again</Button></Card>;
  }

  return (
    <Card style={{ border: '1.5px solid var(--border-light)' }}>
      {isMissingProfile && (
        <div
          style={{
            marginBottom: 'var(--space-md)',
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-clinical-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}
        >
          Let’s complete your health profile so NutriApp can personalize your guidance.
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)' }}>
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
          <User size={18} />
        </div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Physical Metrics</h2>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
          <Input
            label="Age (Years)"
            type="number"
            min="1"
            max="120"
            placeholder="e.g. 45"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />

          <Select
            label="Biological Sex"
            value={sex}
            onChange={(e) => setSex(e.target.value as Sex)}
            options={[
              { value: '', label: 'Select biological sex' },
              { value: 'MALE', label: 'Male' },
              { value: 'FEMALE', label: 'Female' },
            ]}
          />

          <Input
            label="Height (cm)"
            type="number"
            min="50"
            max="260"
            step="0.1"
            placeholder="e.g. 175"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
          />

          <Input
            label="Weight (kg)"
            type="number"
            min="20"
            max="400"
            step="0.1"
            placeholder="e.g. 70.5"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />

          <Select
            label="Activity Level"
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
            options={[
              { value: '', label: 'Select activity level' },
              { value: 'SEDENTARY', label: 'Sedentary (Little or no exercise)' },
              { value: 'LIGHT', label: 'Light (Exercise 1-3 times/week)' },
              { value: 'MODERATE', label: 'Moderate (Exercise 3-5 times/week)' },
              { value: 'ACTIVE', label: 'Active (Daily exercise)' },
              { value: 'VERY_ACTIVE', label: 'Very Active (Intense training)' },
            ]}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={updateMutation.isPending}
          leftIcon={<Check size={18} />}
          style={{ width: 'fit-content', marginTop: 'var(--space-xs)' }}
        >
          Save Physical Metrics
        </Button>
      </form>
    </Card>
  );
};
