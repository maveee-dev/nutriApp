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

  it('renders deterministic food evaluation in an answer-first, partial-evaluation layout', () => {
    const mutate = vi.fn((_request: unknown, options: { onSuccess: (nextResponse: ReturnType<typeof response>) => void }) => {
      options.onSuccess(response({
        answer: 'Based on the nutrition guidance available, this serving can fit your current guidance.\n\nThe supporting score is 86/100.',
        foodEvaluation: {
          foodId: 'banana-ripe',
          displayName: 'Ripe Banana',
          variantLabel: 'Ripe',
          serving: { id: 'serving-1', name: '1 medium banana', grams: '118', quantity: '1' },
          evaluation: {
            score: 86,
            coverage: 80,
            reasons: [{
              code: 'sodium-within-target',
              direction: 'positive',
              nutrient: 'sodium',
              measuredValue: '1 mg',
              targetValue: '2300 mg',
              explanation: 'This serving is low in sodium compared with your current guidance.',
            }],
            contributions: [
              { nutrient: 'potassium', unit: 'mg', amount: '375', targetValue: null, currentDailyValue: null, explanation: 'This serving contributes potassium.' },
              { nutrient: 'sodium', unit: 'mg', amount: '1', targetValue: '2300 mg', currentDailyValue: null, explanation: 'This serving contributes very little sodium.' },
            ],
            deferredPolicies: [{ policyId: 'ckd-potassium-v1', reason: 'missing-target', explanation: 'A personalized potassium target is not configured.' }],
            nutritionInsights: [{
              category: 'potassium',
              severity: 'information',
              title: 'Potassium information',
              message: 'Bananas naturally contain potassium.',
              evidence: { nutrient: 'potassium', amount: '375', unit: 'mg' },
            }],
          },
        },
        aiAssisted: true,
        aiExplanation: 'This is a conversational explanation of the deterministic result.',
      }));
    });
    mockedUseNutritionConsultation.mockReturnValue({ mutate, isPending: false, isError: false, error: null } as never);

    render(<ConsultationPage />);
    const input = screen.getByRole('textbox', { name: 'Your nutrition question' });
    fireEvent.change(input, { target: { value: 'Can I eat bananas?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(screen.getByText('Answer')).toBeInTheDocument();
    expect(screen.getByText('YES, WITH CONTEXT')).toBeInTheDocument();
    expect(screen.getByText(/Based on the nutrition guidance available/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Compatibility score' })).toBeInTheDocument();
    expect(screen.getByText('Supporting score')).toBeInTheDocument();
    expect(screen.getByLabelText('86 out of 100')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nutrition highlights' })).toBeInTheDocument();
    expect(screen.getByText('Potassium information')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Evaluation limitations' })).toHaveTextContent('personalized potassium target');
    expect(screen.getByRole('region', { name: 'AI-generated explanation' })).toHaveTextContent('authoritative');
  });

  it('shows recipe identity and recipe evaluation in the same compatibility presentation', () => {
    const mutate = vi.fn((_request: unknown, options: { onSuccess: (nextResponse: ReturnType<typeof response>) => void }) => {
      options.onSuccess(response({
        answer: 'Yes, one serving of your Chicken Adobo can fit the guidance checked.\n\nThe score is 91/100.',
        foodResolution: {
          status: 'resolved',
          query: 'Can I eat my Chicken Adobo?',
          candidates: [{
            stableId: 'recipe-version-2',
            recipeId: 'recipe-1',
            recipeVersionId: 'recipe-version-2',
            kind: 'approved-recipe',
            displayName: 'Chicken Adobo',
            variantLabel: null,
            recipeYieldServings: '4',
            recipeIngredientNames: ['Chicken Breast', 'Soy Sauce'],
            matchType: 'recipe-exact',
            confidence: 'high',
          }],
        },
        recipeEvaluation: {
          recipeId: 'recipe-1',
          recipeVersionId: 'recipe-version-2',
          recipeVersion: 2,
          portionGrams: '250',
          evaluation: {
            score: 91,
            coverage: 100,
            reasons: [],
            contributions: [{ nutrient: 'protein', unit: 'g', amount: '28', targetValue: '60 g', currentDailyValue: null, explanation: 'A useful protein contribution.' }],
            deferredPolicies: [],
          },
        },
      }));
    });
    mockedUseNutritionConsultation.mockReturnValue({ mutate, isPending: false, isError: false, error: null } as never);

    render(<ConsultationPage />);
    const input = screen.getByRole('textbox', { name: 'Your nutrition question' });
    fireEvent.change(input, { target: { value: 'Can I eat my Chicken Adobo?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(screen.getByRole('heading', { name: 'Chicken Adobo' })).toBeInTheDocument();
    const recipeDetails = screen.getByRole('region', { name: 'Recipe details' });
    expect(recipeDetails).toHaveTextContent('Recipe version 2');
    expect(recipeDetails).toHaveTextContent('Portion checked 250 g');
    expect(recipeDetails).toHaveTextContent('Recipe yield 4 servings');
    expect(screen.getByRole('region', { name: 'Compatibility score' })).toHaveTextContent('91');
    expect(screen.getByText('Complete check')).toBeInTheDocument();
  });
});
