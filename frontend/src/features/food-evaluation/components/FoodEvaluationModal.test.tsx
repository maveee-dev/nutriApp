import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FoodEvaluationModal } from './FoodEvaluationModal';

const { useFoodEvaluationMock } = vi.hoisted(() => ({ useFoodEvaluationMock: vi.fn() }));

vi.mock('../hooks/useFoodEvaluation', () => ({
  useFoodEvaluation: useFoodEvaluationMock,
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
});
