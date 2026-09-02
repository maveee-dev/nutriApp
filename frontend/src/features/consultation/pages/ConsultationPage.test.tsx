import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsultationPage } from './ConsultationPage';
import { useNutritionConsultation } from '../hooks/useNutritionConsultation';

vi.mock('../hooks/useNutritionConsultation', () => ({
  useNutritionConsultation: vi.fn(),
}));

const mockedUseNutritionConsultation = vi.mocked(useNutritionConsultation);

function response(overrides: Record<string, unknown> = {}) {
  return {
    apiVersion: 'v1',
    assistantMode: 'deterministic-evidence' as const,
    question: 'Can I eat bananas?',
    date: '2026-08-19',
    intent: 'food-fit',
    answer: 'I found several possible foods. Which one did you mean?',
    recommendations: {
      apiVersion: 'v1',
      scope: 'daily',
      contextId: 'context-1',
      asOf: '2026-08-19T23:59:59.999Z',
      recommendations: [],
      suppressed: [],
    },
    laboratoryEvidence: [],
    limitations: [],
    ...overrides,
  };
}

describe('ConsultationPage clarification flow', () => {
  beforeEach(() => {
    cleanup();
    mockedUseNutritionConsultation.mockReset();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders structured choices and submits the stable ID with the original question', () => {
    const mutate = vi.fn((request: { clarificationSelection?: unknown }, options: { onSuccess: (nextResponse: ReturnType<typeof response>) => void }) => {
      if (request.clarificationSelection) {
        options.onSuccess(response({
          answer: 'I checked Ripe Banana using the 1 banana serving. Its compatibility score is 82/100.',
          pendingClarification: undefined,
        }));
        return;
      }

      options.onSuccess(response({
        pendingClarification: {
          type: 'food' as const,
          originalQuestion: 'Can I eat bananas?',
          choices: [
            { stableId: 'banana-plain', foodId: 'banana-plain', kind: 'food' as const, displayName: 'Banana', variantLabel: 'Raw', matchType: 'display-exact', confidence: 'high' as const },
            { stableId: 'banana-ripe', foodId: 'banana-ripe', kind: 'food' as const, displayName: 'Ripe Banana', variantLabel: null, matchType: 'display-exact', confidence: 'high' as const },
          ],
        },
      }));
    });
    mockedUseNutritionConsultation.mockReturnValue({ mutate, isPending: false, isError: false, error: null } as never);

    render(<ConsultationPage />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Your nutrition question' }), { target: { value: 'Can I eat bananas?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(screen.getByRole('button', { name: 'Choose Ripe Banana' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose Ripe Banana' }));

    expect(mutate).toHaveBeenCalledTimes(2);
    expect(mutate.mock.calls[1]?.[0]).toMatchObject({
      question: 'Can I eat bananas?',
      clarificationSelection: {
        type: 'food',
        originalQuestion: 'Can I eat bananas?',
        selectedStableId: 'banana-ripe',
      },
    });
    expect(mutate.mock.calls[1]?.[0]).not.toMatchObject({ question: 'Ripe Banana' });
    expect(screen.getByText(/I checked Ripe Banana/)).toBeInTheDocument();
  });

  it('keeps numeric replies compatible with the structured clarification state', () => {
    const mutate = vi.fn((request: { clarificationSelection?: unknown }, options: { onSuccess: (nextResponse: ReturnType<typeof response>) => void }) => {
      options.onSuccess(request.clarificationSelection
        ? response({ answer: 'I checked Banana using the 1 banana serving.' })
        : response({
          pendingClarification: {
            type: 'food' as const,
            originalQuestion: 'Can I eat bananas?',
            choices: [{ stableId: 'banana-plain', foodId: 'banana-plain', kind: 'food' as const, displayName: 'Banana', variantLabel: null, matchType: 'display-exact', confidence: 'high' as const }],
          },
        }));
    });
    mockedUseNutritionConsultation.mockReturnValue({ mutate, isPending: false, isError: false, error: null } as never);

    render(<ConsultationPage />);
    const input = screen.getByRole('textbox', { name: 'Your nutrition question' });
    fireEvent.change(input, { target: { value: 'Can I eat bananas?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(mutate.mock.calls[1]?.[0]).toMatchObject({
      question: 'Can I eat bananas?',
      clarificationSelection: { selectedStableId: 'banana-plain' },
    });
  });

  it('shows recipe differentiators for duplicate personal recipe choices', () => {
    mockedUseNutritionConsultation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as never);

    render(<ConsultationPage />);

    // Seed the response through the hook callback so the page renders the
    // same structured payload returned by the backend.
    const mutate = mockedUseNutritionConsultation.mock.results[0]?.value.mutate as ReturnType<typeof vi.fn>;
    mutate.mockImplementation((_request: unknown, options: { onSuccess: (nextResponse: ReturnType<typeof response>) => void }) => {
      options.onSuccess(response({
        pendingClarification: {
          type: 'food' as const,
          originalQuestion: 'Can I eat my Chicken Adobo?',
          choices: [{
            stableId: 'recipe-version-1',
            recipeId: 'recipe-1',
            recipeVersionId: 'recipe-version-1',
            kind: 'approved-recipe' as const,
            displayName: 'Chicken Adobo',
            variantLabel: null,
            recipeYieldServings: '4',
            recipeIngredientNames: ['Chicken Breast', 'Soy Sauce', 'Vinegar'],
            matchType: 'recipe-exact',
            confidence: 'high' as const,
          }],
        },
      }));
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Your nutrition question' }), { target: { value: 'Can I eat my Chicken Adobo?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(screen.getByText('Makes 4 servings')).toBeInTheDocument();
    expect(screen.getByText('Chicken Breast, Soy Sauce, Vinegar')).toBeInTheDocument();
  });
});
