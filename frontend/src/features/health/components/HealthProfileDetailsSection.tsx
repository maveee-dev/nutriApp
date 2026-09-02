import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useHealthProfile, useUpdateHealthProfileMutation } from '../hooks/useHealth';
import { ClipboardList, Pill, Plus, X } from 'lucide-react';

export const HealthProfileDetailsSection: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useHealthProfile();
  const mutation = useUpdateHealthProfileMutation();
  const [allergyName, setAllergyName] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [medicationDosage, setMedicationDosage] = useState('');
  const [medicationFrequency, setMedicationFrequency] = useState('');

  useEffect(() => {
    if (!mutation.isSuccess) return;
    setAllergyName('');
    setMedicationName('');
    setMedicationDosage('');
    setMedicationFrequency('');
  }, [mutation.isSuccess]);

  if (isLoading) return <LoadingSpinner label="Loading health details..." size={20} />;
  if (isError || data == null) {
    return <Card><p style={{ color: 'var(--color-danger)' }}>{error?.message || 'Could not load health details.'}</p><Button variant="secondary" size="sm" onClick={() => void refetch()} style={{ marginTop: 8 }}>Try again</Button></Card>;
  }

  const addAllergy = () => {
    const name = allergyName.trim();
    if (!name || mutation.isPending) return;
    mutation.mutate({ allergies: [...data.allergies.map((item) => ({ name: item.name, reaction: item.reaction ?? undefined, notes: item.notes ?? undefined })), { name }] });
  };

  const removeAllergy = (name: string) => {
    mutation.mutate({ allergies: data.allergies.filter((item) => item.name !== name).map((item) => ({ name: item.name, reaction: item.reaction ?? undefined, notes: item.notes ?? undefined })) });
  };

  const addMedication = () => {
    const name = medicationName.trim();
    if (!name || mutation.isPending) return;
    mutation.mutate({ medications: [...data.medications.map((item) => ({ name: item.name, dosage: item.dosage ?? undefined, frequency: item.frequency ?? undefined, notes: item.notes ?? undefined })), { name, dosage: medicationDosage.trim() || undefined, frequency: medicationFrequency.trim() || undefined }] });
  };

  const removeMedication = (id: string) => {
    mutation.mutate({ medications: data.medications.filter((item) => item.id !== id).map((item) => ({ name: item.name, dosage: item.dosage ?? undefined, frequency: item.frequency ?? undefined, notes: item.notes ?? undefined })) });
  };

  return (
    <Card style={{ border: '1.5px solid var(--border-light)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-xl)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}>
            <ClipboardList size={19} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Allergies</h2>
          </div>
          {data.allergies.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No allergies recorded.</p> : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-md)' }}>
              {data.allergies.map((item) => <span key={item.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 'var(--radius-full)', background: 'var(--color-clinical-light)', fontSize: '0.85rem' }}>{item.name}<button type="button" aria-label={`Remove ${item.name}`} onClick={() => removeAllergy(item.name)} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}><X size={14} /></button></span>)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Input label="Add allergy" value={allergyName} onChange={(event) => setAllergyName(event.target.value)} placeholder="e.g. Peanuts" />
            <Button type="button" variant="secondary" onClick={addAllergy} disabled={!allergyName.trim() || mutation.isPending} leftIcon={<Plus size={16} />}>Add</Button>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}>
            <Pill size={19} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Medications</h2>
          </div>
          {data.medications.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No medications recorded.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 'var(--space-md)' }}>
              {data.medications.map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-secondary)', fontSize: '0.85rem' }}><span><strong>{item.name}</strong>{item.dosage ? ` · ${item.dosage}` : ''}{item.frequency ? ` · ${item.frequency}` : ''}</span><button type="button" aria-label={`Remove ${item.name}`} onClick={() => removeMedication(item.id)} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}><X size={14} /></button></div>)}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Input label="Medication name" value={medicationName} onChange={(event) => setMedicationName(event.target.value)} placeholder="e.g. Lisinopril" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><Input label="Dosage" value={medicationDosage} onChange={(event) => setMedicationDosage(event.target.value)} placeholder="Optional" /><Input label="Frequency" value={medicationFrequency} onChange={(event) => setMedicationFrequency(event.target.value)} placeholder="Optional" /></div>
            <Button type="button" variant="secondary" onClick={addMedication} disabled={!medicationName.trim() || mutation.isPending} isLoading={mutation.isPending} leftIcon={<Plus size={16} />}>Add medication</Button>
          </div>
        </div>
      </div>
      {mutation.isError && <p style={{ color: 'var(--color-danger)', marginTop: 'var(--space-md)', fontSize: '0.85rem' }}>{(mutation.error as Error).message}</p>}
    </Card>
  );
};
