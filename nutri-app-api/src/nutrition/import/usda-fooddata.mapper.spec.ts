import { UsdaFoodDataMapper } from '../../../prisma/import/usda-fooddata.mapper.js';

describe('UsdaFoodDataMapper', () => {
  const mapper = new UsdaFoodDataMapper();
  const record = {
    fdcId: 123,
    dataType: 'Foundation',
    description: 'Test food',
    foodCategory: 'Vegetables',
    foodNutrients: [
      { nutrientId: 1003, nutrientName: 'Protein', unitName: 'G', value: 3.2 },
      { nutrientId: 1093, nutrientName: 'Sodium', unitName: 'MG', value: 20 },
    ],
    foodPortions: [{ portionDescription: '1 cup', gramWeight: 150 }],
  } as const;

  it('maps USDA nutrients as canonical per-100-gram values and preserves gram servings', () => {
    expect(mapper.map(record)).toEqual({
      source: 'usda-fdc',
      sourceId: '123',
      name: 'Test food',
      category: { sourceId: 'vegetables', name: 'Vegetables' },
      nutrients: [
        { sourceId: '1003', name: 'Protein', unit: 'g', amountPer100Grams: '3.2' },
        { sourceId: '1093', name: 'Sodium', unit: 'mg', amountPer100Grams: '20' },
      ],
      servings: [{ name: '1 cup', grams: '150' }],
    });
  });

  it('maps the current Foundation Foods nested nutrient shape and microgram units', () => {
    const currentRecord = {
      fdcId: 456,
      dataType: 'foundation_food',
      description: 'Current format food',
      foodCategory: { id: 9, description: 'Fruit' },
      foodNutrients: [{
        nutrient: { id: 1106, name: 'Vitamin A', unitName: 'µg' },
        amount: 12.5,
      }],
      foodPortions: [{
        portionDescription: '1 piece',
        gramWeight: 80,
        measureUnit: { name: 'piece', abbreviation: 'pc' },
      }],
    };

    expect(mapper.map(currentRecord)).toMatchObject({
      sourceId: '456',
      category: { sourceId: 'fruit', name: 'Fruit' },
      nutrients: [{ sourceId: '1106', name: 'Vitamin A', unit: 'mcg', amountPer100Grams: '12.5' }],
      servings: [{ name: '1 piece', grams: '80' }],
    });
  });

  it('rejects unsupported USDA data types to avoid importing non-canonical bases', () => {
    expect(() => mapper.map({ ...record, dataType: 'Branded' })).toThrow('unsupported dataType');
  });

  it('reports duplicate and invalid records without fabricating replacements', () => {
    const result = mapper.mapMany([record, record, { ...record, fdcId: 124, foodNutrients: [] }]);
    expect(result.records).toHaveLength(1);
    expect(result.issues).toEqual([
      { sourceId: '123', message: 'Duplicate USDA fdcId in input.' },
      { sourceId: '124', message: 'USDA food 124 has no nutrients.' },
    ]);
  });

  it('skips null dataset entries and continues mapping later records', () => {
    const result = mapper.mapMany([null, record]);

    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.sourceId).toBe('123');
    expect(result.issues).toEqual([{
      sourceId: 'index:0',
      message: 'USDA record is null and was skipped.',
    }]);
  });

  it('keeps foods with no portions by creating a canonical 100 gram serving', () => {
    const result = mapper.map({
      ...record,
      fdcId: 789,
      foodPortions: [],
    });

    expect(result.servings).toEqual([{ name: '100 g', grams: '100' }]);
  });

  it('skips invalid nutrients individually while retaining usable nutrients', () => {
    const result = mapper.map({
      ...record,
      fdcId: 790,
      foodNutrients: [
        { nutrientId: 1, nutrientName: 'Invalid unit', unitName: 'IU', amount: 10 },
        { nutrientId: 2, nutrientName: 'Missing amount', unitName: 'G', amount: null },
        { nutrientId: 3, nutrientName: 'Protein', unitName: 'G', amount: 4 },
      ],
    });

    expect(result.nutrients).toEqual([
      { sourceId: '3', name: 'Protein', unit: 'g', amountPer100Grams: '4' },
    ]);
  });

  it('rejects a food when filtering leaves no usable nutrients', () => {
    expect(() => mapper.map({
      ...record,
      fdcId: 791,
      foodNutrients: [
        { nutrientId: 1, nutrientName: 'Invalid unit', unitName: 'IU', amount: 10 },
        { nutrientId: 2, nutrientName: 'Missing amount', unitName: 'G', amount: null },
      ],
    })).toThrow('has no nutrients');
  });
});
