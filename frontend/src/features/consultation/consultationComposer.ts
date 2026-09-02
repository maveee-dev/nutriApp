export interface ConsultationComposerKeyEvent {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly isComposing?: boolean;
  readonly keyCode?: number;
}

/**
 * Enter sends a consultation message, while Shift+Enter keeps the native
 * textarea newline behavior. Composition Enter events must remain untouched
 * so IME users can complete text entry without submitting prematurely.
 */
export function isConsultationSendShortcut(event: ConsultationComposerKeyEvent): boolean {
  return event.key === 'Enter'
    && !event.shiftKey
    && !event.isComposing
    && event.keyCode !== 229;
}
