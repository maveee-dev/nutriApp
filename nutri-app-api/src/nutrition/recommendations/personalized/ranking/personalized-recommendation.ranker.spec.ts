import { rankPersonalizedRecommendations, PersonalizedRankedCandidate } from './personalized-recommendation.ranker.js';

function candidate(id: string, score: number, protein: string, sodium = '100'): PersonalizedRankedCandidate {
  return {
    food: { id, name: id, displayName: id, variantLabel: null, category: { id: `category-${id}`, name: 'Food' }, servings: [], nutrients: [], createdAt: new Date(), updatedAt: new Date() } as never,
    serving: { id: `serving-${id}`, name: '1 serving', grams: '100' } as never,
    evaluation: {
      score,
      coverage: 100,
      evaluationStatus: 'evaluated',
      reasons: [],
      contributions: [
        { nutrient: 'protein', amount: protein, unit: 'g', targetValue: null, currentDailyValue: null, explanation: '' },
        { nutrient: 'sodium', amount: sodium, unit: 'mg', targetValue: null, currentDailyValue: null, explanation: '' },
      ],
      deferredPolicies: [],
    },
    budgetImpact: [],
    highlights: [],
    whyRecommended: '',
    limitations: [],
  };
}

describe('rankPersonalizedRecommendations', () => {
  it('prioritizes the requested nutrient, then uses score and stable identity ordering', () => {
    const ranked = rankPersonalizedRecommendations([candidate('lower', 99, '10'), candidate('higher', 80, '30')], 'HIGHER_PROTEIN', {});
    expect(ranked.map(({ food }) => food.id)).toEqual(['higher', 'lower']);
  });

  it('orders lower nutrient goals without creating or requiring a target', () => {
    const ranked = rankPersonalizedRecommendations([candidate('high-sodium', 99, '10', '900'), candidate('low-sodium', 80, '10', '100')], 'LOWER_SODIUM', {});
    expect(ranked.map(({ food }) => food.id)).toEqual(['low-sodium', 'high-sodium']);
  });
});
