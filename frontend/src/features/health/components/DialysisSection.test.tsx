import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DialysisSection } from './DialysisSection';

const state = vi.hoisted(() => ({
  dialysis: null as {
    status: 'ACTIVE' | 'INACTIVE';
    modality: 'UNKNOWN' | 'HEMODIALYSIS' | 'PERITONEAL_DIALYSIS' | 'CONFLICTING';
    effectiveAt: string | null;
    reportedAt: string;
    updatedAt: string;
  } | null,
  mutate: vi.fn(),
}));

vi.mock('../hooks/useHealth', () => ({
  useDialysisStatus: () => ({
    data: state.dialysis,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdateDialysisMutation: () => ({
    mutate: state.mutate,
    isPending: false,
  }),
}));

describe('DialysisSection', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    state.dialysis = null;
    state.mutate.mockReset();
  });

  it('keeps a missing dialysis record unselected and requires an explicit choice', () => {
    render(<DialysisSection />);

    expect(screen.getByLabelText('Current Dialysis Status')).toHaveValue('');
    expect(screen.queryByLabelText('Dialysis Type')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Update Dialysis Status' }));

    expect(screen.getByText('Choose whether you are on dialysis before saving.')).toBeInTheDocument();
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it('saves an explicit no-dialysis choice without exposing an internal modality', () => {
    render(<DialysisSection />);

    fireEvent.change(screen.getByLabelText('Current Dialysis Status'), { target: { value: 'INACTIVE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Dialysis Status' }));

    expect(state.mutate).toHaveBeenCalledWith({
      status: 'INACTIVE',
      effectiveAt: null,
    });
    expect(screen.queryByText('UNKNOWN')).not.toBeInTheDocument();
    expect(screen.queryByText('CONFLICTING')).not.toBeInTheDocument();
  });

  it('requires and submits peritoneal dialysis explicitly', () => {
    render(<DialysisSection />);

    fireEvent.change(screen.getByLabelText('Current Dialysis Status'), { target: { value: 'ACTIVE' } });
    expect(screen.getByLabelText('Dialysis Type')).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Update Dialysis Status' }));
    expect(screen.getByText('Please confirm your dialysis type before saving.')).toBeInTheDocument();
    expect(state.mutate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Dialysis Type'), { target: { value: 'PERITONEAL_DIALYSIS' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Dialysis Status' }));

    expect(state.mutate).toHaveBeenCalledWith({
      status: 'ACTIVE',
      modality: 'PERITONEAL_DIALYSIS',
      effectiveAt: null,
    });
  });

  it('explicitly clears an existing dialysis start date', async () => {
    state.dialysis = {
      status: 'ACTIVE',
      modality: 'HEMODIALYSIS',
      effectiveAt: '2026-08-20T00:00:00.000Z',
      reportedAt: '2026-08-29T00:00:00.000Z',
      updatedAt: '2026-08-29T00:00:00.000Z',
    };
    render(<DialysisSection />);

    await waitFor(() => expect(screen.getByLabelText('Dialysis start date (optional)')).toHaveValue('2026-08-20'));
    fireEvent.change(screen.getByLabelText('Dialysis start date (optional)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Dialysis Status' }));

    expect(state.mutate).toHaveBeenCalledWith({
      status: 'ACTIVE',
      modality: 'HEMODIALYSIS',
      effectiveAt: null,
    });
  });

  it('loads known hemodialysis and prompts for an unknown or conflicting modality', async () => {
    state.dialysis = {
      status: 'ACTIVE',
      modality: 'HEMODIALYSIS',
      effectiveAt: null,
      reportedAt: '2026-08-29T00:00:00.000Z',
      updatedAt: '2026-08-29T00:00:00.000Z',
    };
    const { unmount } = render(<DialysisSection />);

    await waitFor(() => expect(screen.getByLabelText('Dialysis Type')).toHaveValue('HEMODIALYSIS'));
    unmount();

    state.dialysis = {
      status: 'ACTIVE',
      modality: 'CONFLICTING',
      effectiveAt: null,
      reportedAt: '2026-08-29T00:00:00.000Z',
      updatedAt: '2026-08-29T00:00:00.000Z',
    };
    render(<DialysisSection />);

    await waitFor(() => expect(screen.getByLabelText('Dialysis Type')).toHaveValue(''));
    expect(screen.getByText('This helps NutriApp apply the correct treatment-specific guidance.')).toBeInTheDocument();
    expect(screen.queryByText('UNKNOWN')).not.toBeInTheDocument();
    expect(screen.queryByText('CONFLICTING')).not.toBeInTheDocument();
  });
});
