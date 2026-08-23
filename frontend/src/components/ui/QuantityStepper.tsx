import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface QuantityStepperProps {
  value: string | number;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  unitLabel?: string;
  readOnly?: boolean;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 0.25,
  max = 100,
  step = 0.25,
  unitLabel = '',
  readOnly = true,
}) => {
  const numVal = parseFloat(String(value)) || 0;
  const quantityScale = 100;

  const steppedValue = (delta: number): string => {
    const currentUnits = Math.round(numVal * quantityScale);
    const deltaUnits = Math.round(delta * quantityScale);
    const minUnits = Math.round(min * quantityScale);
    const maxUnits = Math.round(max * quantityScale);
    const nextUnits = Math.min(
      maxUnits,
      Math.max(minUnits, currentUnits + deltaUnits),
    );

    return (nextUnits / quantityScale).toFixed(2);
  };

  const handleDecrement = () => {
    onChange(steppedValue(-step));
  };

  const handleIncrement = () => {
    onChange(steppedValue(step));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    onChange(raw);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-surface-secondary)',
          borderRadius: 'var(--radius-full)',
          padding: '4px',
          border: '1.5px solid var(--border-light)',
          width: 'fit-content',
        }}
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={handleDecrement}
          disabled={numVal <= min}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            backgroundColor: numVal <= min ? 'transparent' : 'var(--bg-surface)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: numVal <= min ? 'not-allowed' : 'pointer',
            boxShadow: numVal <= min ? 'none' : 'var(--shadow-sm)',
            transition: 'transform var(--transition-fast)',
          }}
        >
          <Minus size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            min={min}
            max={max}
            step="any"
            readOnly={readOnly}
            style={{
              width: '56px',
              textAlign: 'center',
              border: 'none',
              background: 'transparent',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: readOnly ? 'default' : 'text',
              userSelect: 'none',
            }}
          />
          {unitLabel && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {unitLabel}
            </span>
          )}
        </div>

        <button
          type="button"
          aria-label="Increase quantity"
          onClick={handleIncrement}
          disabled={numVal >= max}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            backgroundColor: numVal >= max ? 'transparent' : 'var(--color-primary)',
            color: numVal >= max ? 'var(--text-muted)' : 'var(--text-inverse)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: numVal >= max ? 'not-allowed' : 'pointer',
            boxShadow: numVal >= max ? 'none' : '0 2px 0 var(--color-primary-shadow)',
            transition: 'transform var(--transition-fast)',
          }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};
