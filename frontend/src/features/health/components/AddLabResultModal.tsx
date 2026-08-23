import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCreateLabResultMutation } from '../hooks/useHealth';
import { format } from 'date-fns';

export type SupportedLabTestCode = 'egfr' | 'potassium' | 'phosphorus';

export interface AddLabResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTestCode?: SupportedLabTestCode;
}

const LAB_TESTS: Record<SupportedLabTestCode, { label: string; unit: string; referenceLow: string }> = {
  egfr: {
    label: 'eGFR (Estimated Glomerular Filtration Rate)',
    unit: 'mL/min/1.73m2',
    referenceLow: '60',
  },
  potassium: {
    label: 'Serum Potassium',
    unit: 'mmol/L',
    referenceLow: '',
  },
  phosphorus: {
    label: 'Serum Phosphorus',
    unit: 'mg/dL',
    referenceLow: '',
  },
};

export const AddLabResultModal: React.FC<AddLabResultModalProps> = ({
  isOpen,
  onClose,
  initialTestCode = 'egfr',
}) => {
  const [testCode, setTestCode] = useState<SupportedLabTestCode>(initialTestCode);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(LAB_TESTS[initialTestCode].unit);
  const [referenceLow, setReferenceLow] = useState(LAB_TESTS[initialTestCode].referenceLow);
  const [referenceHigh, setReferenceHigh] = useState('');
  const [collectedAt, setCollectedAt] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [errors, setErrors] = useState<{ value?: string; collectedAt?: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    const config = LAB_TESTS[initialTestCode];
    setTestCode(initialTestCode);
    setUnit(config.unit);
    setReferenceLow(config.referenceLow);
  }, [initialTestCode, isOpen]);

  const resetForm = () => {
    setValue('');
    setReferenceHigh('');
    setCollectedAt(format(new Date(), 'yyyy-MM-dd'));
    setErrors({});
  };

  const createMutation = useCreateLabResultMutation(() => {
    resetForm();
    onClose();
  });

  const handleTestCodeChange = (nextCode: SupportedLabTestCode) => {
    const config = LAB_TESTS[nextCode];
    setTestCode(nextCode);
    setUnit(config.unit);
    setReferenceLow(config.referenceLow);
    setReferenceHigh('');
  };

  const validate = () => {
    const nextErrors: { value?: string; collectedAt?: string } = {};
    if (!value || Number.isNaN(Number.parseFloat(value))) nextErrors.value = 'Please enter a valid numeric value';
    if (!collectedAt) nextErrors.collectedAt = 'Collection date is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    createMutation.mutate({
      testCode,
      value: String(Number.parseFloat(value)),
      unit,
      referenceLow: referenceLow ? String(Number.parseFloat(referenceLow)) : undefined,
      referenceHigh: referenceHigh ? String(Number.parseFloat(referenceHigh)) : undefined,
      collectedAt: new Date(collectedAt).toISOString(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Lab Result"
      subtitle="Add laboratory evidence used by your personalized nutrition guidance."
      maxWidth="480px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <Select
          label="Test Type"
          value={testCode}
          onChange={(event) => handleTestCodeChange(event.target.value as SupportedLabTestCode)}
          options={Object.entries(LAB_TESTS).map(([optionValue, config]) => ({
            value: optionValue,
            label: config.label,
          }))}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <Input
            label="Result Value"
            type="number"
            step="0.1"
            placeholder="Enter the reported value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            error={errors.value}
            required
            autoFocus
          />

          <Input
            label="Unit of Measure"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <Input
            label="Reference Low (Optional)"
            type="number"
            step="0.1"
            value={referenceLow}
            onChange={(event) => setReferenceLow(event.target.value)}
          />

          <Input
            label="Reference High (Optional)"
            type="number"
            step="0.1"
            value={referenceHigh}
            onChange={(event) => setReferenceHigh(event.target.value)}
          />
        </div>

        <Input
          label="Collection Date"
          type="date"
          value={collectedAt}
          onChange={(event) => setCollectedAt(event.target.value)}
          error={errors.collectedAt}
          required
        />

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Enter the value and unit exactly as shown on the laboratory report. NutriApp validates supported units before using the result.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
          <Button type="button" variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={createMutation.isPending} style={{ flex: 1 }}>
            Save Lab Result
          </Button>
        </div>
      </form>
    </Modal>
  );
};
