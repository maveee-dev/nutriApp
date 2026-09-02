import { describe, expect, it } from 'vitest';
import { isConsultationSendShortcut } from './consultationComposer';

describe('isConsultationSendShortcut', () => {
  it('sends on a plain Enter key', () => {
    expect(isConsultationSendShortcut({ key: 'Enter', shiftKey: false })).toBe(true);
  });

  it('keeps Shift+Enter as a newline', () => {
    expect(isConsultationSendShortcut({ key: 'Enter', shiftKey: true })).toBe(false);
  });

  it('does not submit while an IME composition is active', () => {
    expect(isConsultationSendShortcut({ key: 'Enter', shiftKey: false, isComposing: true })).toBe(false);
    expect(isConsultationSendShortcut({ key: 'Enter', shiftKey: false, keyCode: 229 })).toBe(false);
  });

  it('ignores non-Enter keys', () => {
    expect(isConsultationSendShortcut({ key: 'a', shiftKey: false })).toBe(false);
  });
});
