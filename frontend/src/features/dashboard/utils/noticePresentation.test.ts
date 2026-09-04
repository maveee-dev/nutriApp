import { describe, expect, it } from 'vitest';
import { presentDashboardNotice } from './noticePresentation';

const notice = (overrides: Partial<Parameters<typeof presentDashboardNotice>[0]> = {}) => ({
  category: 'potassium',
  severity: 'warning',
  title: 'More information needed',
  message: 'A current potassium result is required.',
  source: 'laboratory' as const,
  ...overrides,
});

describe('presentDashboardNotice', () => {
  it('deep-links laboratory notices to the matching Health section', () => {
    expect(presentDashboardNotice(notice())).toMatchObject({
      title: 'Review your Potassium result',
      action: { label: 'Review Potassium results', to: '/health?addLab=potassium#laboratory-results' },
    });
  });

  it('makes target setup actionable without exposing technical wording', () => {
    expect(presentDashboardNotice(notice({ source: 'target-configuration', category: 'potassium', message: 'No target configured.' }))).toMatchObject({
      title: 'Potassium target not set',
      action: { to: '/nutrition-targets' },
    });
  });

  it('does not invent a destination for notices with no in-app completion flow', () => {
    const presentation = presentDashboardNotice(notice({ source: 'nutrition-insight', category: 'fiber', message: 'Keep including fiber.' }));
    expect(presentation.action).toBeUndefined();
    expect(presentation.message).toBe('Keep including fiber.');
  });
});
