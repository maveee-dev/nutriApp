import { jest } from '@jest/globals';
import { FoodsRepository } from './foods.repository.js';

const category = {
  id: 'category-rice',
  name: 'Cereals',
  description: null,
};

function foodRow(
  id: string,
  name: string,
  displayName: string,
  searchPriority: number,
) {
  return {
    id,
    name,
    description: null,
    category,
    presentation: {
      displayNameOverride: displayName,
      variantLabelOverride: null,
      searchPriority,
      aliases: [],
    },
  };
}

describe('FoodsRepository search ordering', () => {
  it('diversifies catalog pages but leaves recognition ordering unchanged', async () => {
    const rows = [
      foodRow('white-1', 'Rice, white, cooked', 'White Rice', 4),
      foodRow('white-2', 'Rice, white, raw', 'White Rice', 3),
      foodRow('brown', 'Rice, brown, cooked', 'Brown Rice', 2),
      foodRow('wild', 'Wild rice, cooked', 'Wild Rice', 1),
      foodRow('brown-2', 'Rice, brown, raw', 'Brown Rice', 0),
    ];
    const prisma = {
      food: {
        findMany: jest.fn().mockResolvedValue(rows),
      },
    };
    const repository = new FoodsRepository(prisma as never);

    const catalog = await repository.findManyWithCount({
      search: 'rice',
      skip: 0,
      take: 3,
      rankingContext: 'catalog',
    });
    const recognition = await repository.findManyWithCount({
      search: 'rice',
      skip: 0,
      take: 3,
      rankingContext: 'food-recognition',
    });

    expect(catalog.items.map(({ id }) => id)).toEqual([
      'white-1',
      'brown',
      'wild',
    ]);
    expect(catalog.totalItems).toBe(5);
    expect(recognition.items.map(({ id }) => id)).toEqual([
      'white-1',
      'white-2',
      'brown',
    ]);
    expect(recognition.totalItems).toBe(5);
  });
});
