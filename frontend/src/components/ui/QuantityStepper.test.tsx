import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuantityStepper } from './QuantityStepper';

describe('QuantityStepper', () => {
  it('reverses a quarter-serving increment without floating-point drift', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <QuantityStepper value="1.00" onChange={onChange} step={0.25} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(onChange).toHaveBeenLastCalledWith('1.25');

    rerender(<QuantityStepper value="1.25" onChange={onChange} step={0.25} />);
    fireEvent.click(screen.getByRole('button', { name: 'Decrease quantity' }));
    expect(onChange).toHaveBeenLastCalledWith('1.00');
  });
});
