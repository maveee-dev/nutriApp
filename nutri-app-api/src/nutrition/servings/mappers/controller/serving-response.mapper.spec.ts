import { ServingResponseMapper } from './serving-response.mapper.js';

describe('ServingResponseMapper', () => {
  it('maps the serving name from the source name', () => {
    const response = ServingResponseMapper.toServingDto({
      id: 'serving-id',
      name: 'One cup',
      grams: '195',
    });

    expect(response.name).toBe('One cup');
  });
});
