import { ConsultationIntentRouter } from './consultation-intent.router.js';

describe('ConsultationIntentRouter', () => {
  const router = new ConsultationIntentRouter();

  it.each([
    ['Who created you?', 'creator'],
    ['Calculate the protein in this meal.', 'calculation'],
    ['Can you help me with programming?', 'unrelated'],
    ['Can I eat chicken adobo?', 'food'],
    ['Which lab result affected my guidance?', 'lab-evidence'],
    ['How am I doing today?', 'meal-progress'],
    ['What should I eat next?', 'recommendation'],
    ['Why is sodium important?', 'education'],
  ] as const)('routes %s to %s', (question, lane) => {
    expect(router.route(question)).toMatchObject({ lane });
  });

  it.each([
    'What foods are great for me?',
    'Healthy foods',
    'Good foods',
    'Best foods for me',
    'Foods I should eat',
    'What can I eat?',
    'Meals for me',
  ])('routes broad food request "%s" to recommendation', (question) => {
    expect(router.route(question)).toMatchObject({
      lane: 'recommendation',
      aiPolicy: 'optional',
    });
  });

  it.each([
    ['Ano ang magandang pagkain para sa akin?', 'recommendation'],
    ['Anong pagkain ang dapat kong kainin?', 'recommendation'],
    ['Pwede ba kainin ang adobong manok?', 'food'],
    ['Okay ba ang kanin?', 'food'],
  ] as const)('routes natural Taglish phrasing "%s" to %s', (question, lane) => {
    expect(router.route(question)).toMatchObject({ lane });
  });

  it('applies creator precedence before unrelated or education rules', () => {
    expect(router.route('Who is your developer?').lane).toBe('creator');
    expect(router.route('Who created you for nutrition?').lane).toBe('creator');
  });

  it('applies calculation precedence before food routing', () => {
    expect(router.route('How many carbs are in a banana?')).toMatchObject({
      lane: 'calculation',
      aiPolicy: 'never',
    });
  });

  it('uses recent conversation context for follow-up classification', () => {
    expect(router.route('Is it okay?', [{ role: 'user', content: 'Can I eat a banana?' }]).lane).toBe('food');
  });

  it('does not inherit nutrition routing for a new unrelated question', () => {
    expect(router.route('What is the weather?', [{ role: 'user', content: 'Can I eat a banana?' }]).lane).toBe('unrelated');
  });

  it('defaults non-nutrition questions to the deterministic unrelated lane', () => {
    expect(router.route('What is the capital of France?')).toMatchObject({
      lane: 'unrelated',
      aiPolicy: 'never',
    });
  });
});
