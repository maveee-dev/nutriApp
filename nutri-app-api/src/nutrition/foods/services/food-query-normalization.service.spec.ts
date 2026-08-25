import { FoodQueryNormalizationService } from './food-query-normalization.service.js';

describe('FoodQueryNormalizationService', () => {
  const service = new FoodQueryNormalizationService();

  it('removes conversational English and Taglish words without removing food terms', () => {
    expect(service.removeConversationalWords('Pwede ba kainin ang adobong manok?')).toBe('adobong manok');
    expect(service.removeConversationalWords('Can I eat white rice?')).toBe('white rice');
  });

  it('expands common Filipino food phrases deterministically', () => {
    expect(service.extractCandidatePhrases('Pwede ba kainin ang adobong manok?')).toEqual(
      expect.arrayContaining(['adobong manok', 'chicken adobo']),
    );
    expect(service.extractCandidatePhrases('homemade adobo')).toEqual(
      expect.arrayContaining(['homemade adobo', 'adobo']),
    );
  });

  it('generates bounded one-edit typo variants', () => {
    expect(service.typoVariants('bananna')).toContain('banana');
    expect(service.typoVariants('chikcen')).toContain('chicken');
    expect(service.typoVariants('banana')).not.toContain('banana');
  });
});
