import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FoodEvaluationModal } from './FoodEvaluationModal';

const { useFoodEvaluationMock, recipeEvaluateMock } = vi.hoisted(() => ({ useFoodEvaluationMock: vi.fn(), recipeEvaluateMock: vi.fn() }));

vi.mock('../hooks/useFoodEvaluation', () => ({
  useFoodEvaluation: useFoodEvaluationMock,
}));

vi.mock('@/features/recipes/api/recipesApi', () => ({
  recipesApi: { evaluate: recipeEvaluateMock },
}));

const food = {
  id: 'food-1',
  name: 'Banana',
  category: { id: 'fruit', name: 'Fruit', description: null },
  servings: [{ id: 'serving-1', name: '1 medium', grams: '118' }],
  nutrients: [],
  createdAt: '2026-08-22T00:00:00.000Z',
  updatedAt: '2026-08-22T00:00:00.000Z',
};

describe('FoodEvaluationModal semantic presentation', () => {
  afterEach(() => cleanup());

  it('renders insufficient evidence as neutral and still shows contribution data', () => {
    useFoodEvaluationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: {
        score: 0,
        evaluationStatus: 'insufficient-evidence',
        coverage: 0,
        reasons: [],
        contributions: [{ nutrient: 'protein', amount: '0.73 g', targetValue: '64 g', currentDailyValue: null, explanation: 'This portion provides a small amount of protein toward the daily target.' }],
        deferredPolicies: [],
      },
    });

    render(<FoodEvaluationModal isOpen onClose={vi.fn()} food={food} selectedServing={food.servings[0]} quantity="1" />);

    expect(screen.getByText(/not enough evidence to score/i)).toBeInTheDocument();
    expect(screen.getByText('Contribution')).toBeInTheDocument();
    expect(screen.getByText(/small amount of protein/i)).toBeInTheDocument();
    expect(screen.queryByText('/ 100')).not.toBeInTheDocument();
  });

  it('renders every informational deferral instead of only the first one', () => {
    useFoodEvaluationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: {
        score: 100,
        evaluationStatus: 'evaluated',
        coverage: 100,
        reasons: [],
        contributions: [],
        deferredPolicies: [
          { policyId: 'ckd-potassium-v1', reason: 'missing-individualized-potassium-target', explanation: 'Potassium was not included in this score.' },
          { policyId: 'ckd-phosphorus-v1', reason: 'missing-individualized-phosphorus-target', explanation: 'Phosphorus was not included in this score.' },
        ],
      },
    });

    render(<FoodEvaluationModal isOpen onClose={vi.fn()} food={food} selectedServing={food.servings[0]} quantity="1" />);

    expect(screen.getByText('Potassium was not included in this score.')).toBeInTheDocument();
    expect(screen.getByText('Phosphorus was not included in this score.')).toBeInTheDocument();
    expect(screen.getByText('Compatibility check is incomplete')).toBeInTheDocument();
    expect(screen.getAllByText('Information Note')).toHaveLength(2);
  });

  it('keeps a high score neutral when compatibility coverage is incomplete', () => {
    useFoodEvaluationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: {
        score: 100,
        evaluationStatus: 'evaluated',
        coverage: 53.33,
        reasons: [],
        contributions: [],
        deferredPolicies: [],
      },
    });

    render(<FoodEvaluationModal isOpen onClose={vi.fn()} food={food} selectedServing={food.servings[0]} quantity="1" />);

    expect(screen.getByText('Compatibility check is incomplete')).toBeInTheDocument();
    expect(screen.getByText('Supporting score')).toBeInTheDocument();
    expect(screen.queryByText('Looks like a great fit')).not.toBeInTheDocument();
    expect(screen.getByText(/some clinically relevant nutrition guidance was not included/i)).toBeInTheDocument();
    expect(screen.getByText(/this score reflects only the nutrition guidance that could currently be evaluated/i)).toBeInTheDocument();
    expect(screen.queryByText(/53\.33%/i)).not.toBeInTheDocument();
  });

  it('rephrases an unscored potassium contribution without changing its value', () => {
    useFoodEvaluationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: {
        score: 100,
        evaluationStatus: 'evaluated',
        coverage: 53.33,
        reasons: [],
        contributions: [{
          nutrient: 'potassium',
          unit: 'mg',
          amount: '422',
          targetValue: null,
          currentDailyValue: null,
          explanation: 'This portion provides 422 mg of potassium. No applicable potassium policy is currently available.',
        }],
        deferredPolicies: [],
      },
    });

    render(<FoodEvaluationModal isOpen onClose={vi.fn()} food={food} selectedServing={food.servings[0]} quantity="1" />);

    expect(screen.getByText(/This serving contains 422 mg of potassium\. Because a personalized potassium target has not been configured/i)).toBeInTheDocument();
    expect(screen.queryByText(/No applicable potassium policy is currently available/i)).not.toBeInTheDocument();
  });

  it('uses the partial presentation when deferrals exist even with complete numeric coverage', () => {
    useFoodEvaluationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: {
        score: 100,
        evaluationStatus: 'evaluated',
        coverage: 100,
        reasons: [],
        contributions: [],
        deferredPolicies: [{ policyId: 'ckd-phosphorus-v1', reason: 'missing-individualized-phosphorus-target', explanation: 'Phosphorus was not included.' }],
      },
    });

    render(<FoodEvaluationModal isOpen onClose={vi.fn()} food={food} selectedServing={food.servings[0]} quantity="1" />);

    expect(screen.getByText('Compatibility check is incomplete')).toBeInTheDocument();
    expect(screen.getByText('Supporting score')).toBeInTheDocument();
    expect(screen.queryByText('Looks like a great fit')).not.toBeInTheDocument();
  });

  it('renders deterministic nutrition insights separately from compatibility scoring', () => {
    useFoodEvaluationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: {
        score: 100,
        evaluationStatus: 'evaluated',
        coverage: 53.33,
        reasons: [],
        contributions: [],
        deferredPolicies: [],
        nutritionInsights: [{
          category: 'potassium',
          severity: 'information',
          title: 'Potassium information',
          message: 'This serving contains approximately 375 mg of potassium.',
          evidence: { nutrient: 'potassium', amount: '375', unit: 'mg' },
        }],
      },
    });

    render(<FoodEvaluationModal isOpen onClose={vi.fn()} food={food} selectedServing={food.servings[0]} quantity="1" />);

    expect(screen.getByText('Nutrition Insights')).toBeInTheDocument();
    expect(screen.getByText('Potassium information')).toBeInTheDocument();
    expect(screen.getByText('This serving contains approximately 375 mg of potassium.')).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument();
  });

  it('renders recipe evaluations with the same compatibility presentation', async () => {
    useFoodEvaluationMock.mockReturnValue({ mutate: vi.fn(), isPending: false, error: null, data: null });
    recipeEvaluateMock.mockResolvedValue({
      recipeId: 'recipe-1',
      recipeVersionId: 'recipe-version-2',
      recipeVersion: 2,
      portionGrams: '250',
      evaluation: {
        score: 86,
        coverage: 80,
        evaluationStatus: 'evaluated',
        reasons: [],
        contributions: [],
        deferredPolicies: [{ policyId: 'ckd-phosphorus-v1', reason: 'missing-target', explanation: 'Phosphorus was not included.' }],
        nutritionInsights: [],
      },
      targetCalculation: null,
      provenance: null,
      limitations: [],
    });

    render(
      <FoodEvaluationModal
        isOpen
        onClose={vi.fn()}
        food={null}
        selectedServing={null}
        quantity="1"
        recipe={{ id: 'recipe-1', version: 2, name: 'Chicken Adobo' }}
      />,
    );

    await waitFor(() => expect(screen.getByText('Supporting score')).toBeInTheDocument());
    expect(screen.getByText('Compatibility check is incomplete')).toBeInTheDocument();
    expect(screen.getByText('86')).toBeInTheDocument();
    expect(screen.getByText('Phosphorus was not included.')).toBeInTheDocument();
    expect(screen.getByText(/Chicken Adobo/)).toBeInTheDocument();
    expect(recipeEvaluateMock).toHaveBeenCalledWith('recipe-1', { version: 2, servings: '1' });
  });
});
