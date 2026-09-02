import {
  deriveFoodPresentation,
  isModifierOnlyDisplayNameMatch,
  isPrimaryConceptDisplayNameMatch,
  normalizeServingDisplayName,
  resolveFoodPresentation,
} from './food-presentation.service.js';

describe('food presentation derivation', () => {
  it('derives a simple egg display name and variant label', () => {
    expect(
      deriveFoodPresentation('Egg, whole, raw, frozen, pasteurized'),
    ).toEqual({
      derivedDisplayName: 'Egg',
      derivedVariantLabel: 'Raw · Frozen · Pasteurized',
    });
  });

  it('omits redundant whole from bird-egg variants', () => {
    expect(deriveFoodPresentation('Egg, duck, whole, fresh, raw')).toEqual({
      derivedDisplayName: 'Egg',
      derivedVariantLabel: 'Duck · Fresh · Raw',
    });
  });

  it('promotes egg whites, yolks, and sizes while retaining meaningful qualifiers', () => {
    expect(deriveFoodPresentation('Grade A, large, egg white')).toEqual({
      derivedDisplayName: 'Egg White',
      derivedVariantLabel: 'Grade A · Large',
    });
    expect(deriveFoodPresentation('Grade A, large, egg yolk')).toEqual({
      derivedDisplayName: 'Egg Yolk',
      derivedVariantLabel: 'Grade A · Large',
    });
    expect(deriveFoodPresentation('Grade A, large, egg whole')).toEqual({
      derivedDisplayName: 'Large Egg',
      derivedVariantLabel: 'Grade A',
    });
  });

  it('does not use product groups as the primary display name', () => {
    expect(deriveFoodPresentation('Fast foods, egg, scrambled')).toEqual({
      derivedDisplayName: 'Scrambled Egg',
      derivedVariantLabel: 'Fast Food',
    });
    expect(deriveFoodPresentation('Restaurant, chicken sandwich')).toEqual({
      derivedDisplayName: 'Chicken Sandwich',
      derivedVariantLabel: 'Restaurant',
    });
    expect(deriveFoodPresentation('Fast Foods, french fries')).toEqual({
      derivedDisplayName: 'French Fries',
      derivedVariantLabel: 'Fast Food',
    });
    expect(deriveFoodPresentation('Beverages, milk, whole')).toEqual({
      derivedDisplayName: 'Milk',
      derivedVariantLabel: 'Whole',
    });
  });

  it('derives beverage concepts from generic beverage contexts', () => {
    expect(
      deriveFoodPresentation('Beverages, orange juice, canned, unsweetened'),
    ).toEqual({
      derivedDisplayName: 'Orange Juice',
      derivedVariantLabel: 'Canned \u00b7 Unsweetened',
    });
    expect(deriveFoodPresentation('Beverages, coffee, brewed')).toEqual({
      derivedDisplayName: 'Coffee',
      derivedVariantLabel: 'Brewed',
    });
    expect(deriveFoodPresentation('Alcoholic beverage, wine, red')).toEqual({
      derivedDisplayName: 'Red Wine',
      derivedVariantLabel: 'Alcoholic Beverage',
    });
    expect(
      deriveFoodPresentation('Alcoholic beverages, beer, higher alcohol'),
    ).toEqual({
      derivedDisplayName: 'Beer',
      derivedVariantLabel: 'Alcoholic Beverage \u00b7 Higher Alcohol',
    });
    expect(
      deriveFoodPresentation('Beverages, tea, black, ready-to-drink, lemon'),
    ).toEqual({
      derivedDisplayName: 'Black Tea',
      derivedVariantLabel: 'Ready-to-drink \u00b7 Lemon',
    });
    expect(deriveFoodPresentation('Beverages, soy milk, chocolate')).toEqual({
      derivedDisplayName: 'Chocolate Soy Milk',
      derivedVariantLabel: null,
    });
  });

  it('moves restaurant brands into the variant label', () => {
    expect(
      deriveFoodPresentation(
        'KFC, Fried Chicken, EXTRA CRISPY, Breast, meat and skin with breading',
      ),
    ).toEqual({
      derivedDisplayName: 'Fried Chicken',
      derivedVariantLabel: 'KFC · Extra Crispy · Breast · With Breading',
    });
    expect(deriveFoodPresentation("McDONALD'S, Cheeseburger")).toEqual({
      derivedDisplayName: 'Cheeseburger',
      derivedVariantLabel: "McDonald's",
    });
    expect(deriveFoodPresentation('BURGER KING, french fries')).toEqual({
      derivedDisplayName: 'French Fries',
      derivedVariantLabel: 'Burger King',
    });
  });

  it('separates generic branded products from their manufacturer', () => {
    expect(deriveFoodPresentation("APPLEBEE'S, chicken tenders platter")).toEqual(
      {
        derivedDisplayName: 'Chicken Tenders Platter',
        derivedVariantLabel: "Applebee's",
      },
    );
    expect(
      deriveFoodPresentation('Beverages, ABBOTT, EAS soy protein powder'),
    ).toEqual({
      derivedDisplayName: 'EAS Soy Protein Powder',
      derivedVariantLabel: 'Abbott',
    });
    expect(deriveFoodPresentation("Gravy, CAMPBELL'S, chicken")).toEqual({
      derivedDisplayName: 'Chicken Gravy',
      derivedVariantLabel: "Campbell's",
    });
    expect(deriveFoodPresentation('Soup, SWANSON, beef broth')).toEqual({
      derivedDisplayName: 'Beef Broth',
      derivedVariantLabel: 'Soup · Swanson',
    });
    expect(deriveFoodPresentation("CAMPBELL'S, soup, chicken noodle")).toEqual({
      derivedDisplayName: 'Chicken Noodle Soup',
      derivedVariantLabel: "Campbell's",
    });
    expect(
      deriveFoodPresentation('DOMINO\'S 14" Cheese Pizza, Classic Hand-Tossed Crust'),
    ).toEqual({
      derivedDisplayName: '14" Cheese Pizza',
      derivedVariantLabel: "Domino's · Classic Hand-tossed Crust",
    });
    expect(
      deriveFoodPresentation(
        "Cereals ready-to-eat, QUAKER, QUAKER MultiGrain Oatmeal, dry",
      ),
    ).toEqual({
      derivedDisplayName: 'Multigrain Oatmeal',
      derivedVariantLabel: 'Cereals Ready-to-eat · Quaker · Dry',
    });
  });

  it('combines a food-group context, dish form, and protein concept generically', () => {
    expect(
      deriveFoodPresentation('Restaurant, Mexican, Burrito, Beef'),
    ).toEqual({
      derivedDisplayName: 'Beef Burrito',
      derivedVariantLabel: 'Restaurant · Mexican',
    });
    expect(
      deriveFoodPresentation('Fast Foods, Hamburger, Single Patty'),
    ).toEqual({
      derivedDisplayName: 'Hamburger',
      derivedVariantLabel: 'Fast Food · Single Patty',
    });
  });

  it('keeps product brands as the primary food when the brand is the product', () => {
    expect(deriveFoodPresentation('Coca-Cola, cola')).toEqual({
      derivedDisplayName: 'Coca-Cola',
      derivedVariantLabel: 'Cola',
    });
    expect(deriveFoodPresentation('Oreo, cookies')).toEqual({
      derivedDisplayName: 'Oreo',
      derivedVariantLabel: 'Cookies',
    });
    expect(deriveFoodPresentation('Nutella, hazelnut spread')).toEqual({
      derivedDisplayName: 'Nutella',
      derivedVariantLabel: 'Hazelnut Spread',
    });
    expect(deriveFoodPresentation('Beverages, Pepsi, cola')).toEqual({
      derivedDisplayName: 'Pepsi',
      derivedVariantLabel: 'Cola',
    });
    expect(deriveFoodPresentation('Doritos, tortilla chips')).toEqual({
      derivedDisplayName: 'Doritos',
      derivedVariantLabel: 'Tortilla Chips',
    });
  });

  it('converts inverted compound food names into natural display names', () => {
    expect(deriveFoodPresentation('Cookies, oatmeal')).toEqual({
      derivedDisplayName: 'Oatmeal Cookie',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Bread, oatmeal')).toEqual({
      derivedDisplayName: 'Oatmeal Bread',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Soup, chicken noodle')).toEqual({
      derivedDisplayName: 'Chicken Noodle Soup',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Pie, apple')).toEqual({
      derivedDisplayName: 'Apple Pie',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Cereal, oat bran')).toEqual({
      derivedDisplayName: 'Oat Bran Cereal',
      derivedVariantLabel: null,
    });
  });

  it('promotes complete food concepts before product forms', () => {
    expect(deriveFoodPresentation('Egg, noodles, unenriched')).toEqual({
      derivedDisplayName: 'Egg Noodles',
      derivedVariantLabel: 'Unenriched',
    });
    expect(deriveFoodPresentation('Egg, roll, frozen')).toEqual({
      derivedDisplayName: 'Egg Roll',
      derivedVariantLabel: 'Frozen',
    });
    expect(deriveFoodPresentation('Apple, pie, prepared')).toEqual({
      derivedDisplayName: 'Apple Pie',
      derivedVariantLabel: 'Prepared',
    });
    expect(deriveFoodPresentation('Chicken, soup, canned')).toEqual({
      derivedDisplayName: 'Chicken Soup',
      derivedVariantLabel: 'Canned',
    });
    expect(deriveFoodPresentation('Cheese, pizza, frozen')).toEqual({
      derivedDisplayName: 'Cheese Pizza',
      derivedVariantLabel: 'Frozen',
    });
    expect(deriveFoodPresentation('Pizza, cheese')).toEqual({
      derivedDisplayName: 'Cheese Pizza',
      derivedVariantLabel: null,
    });
    expect(
      deriveFoodPresentation('Fast Foods, egg, noodles, unenriched'),
    ).toEqual({
      derivedDisplayName: 'Egg Noodles',
      derivedVariantLabel: 'Fast Food · Unenriched',
    });
    expect(deriveFoodPresentation('Noodles, egg')).toEqual({
      derivedDisplayName: 'Egg Noodles',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Croissants, apple, baked')).toEqual({
      derivedDisplayName: 'Apple Croissant',
      derivedVariantLabel: 'Baked',
    });
    expect(deriveFoodPresentation('Apple, croissant, baked')).toEqual({
      derivedDisplayName: 'Apple Croissant',
      derivedVariantLabel: 'Baked',
    });
    expect(deriveFoodPresentation('Bagels, egg, toasted')).toEqual({
      derivedDisplayName: 'Egg Bagel',
      derivedVariantLabel: 'Toasted',
    });
    expect(deriveFoodPresentation('Sandwiches, chicken, prepared')).toEqual({
      derivedDisplayName: 'Chicken Sandwich',
      derivedVariantLabel: 'Prepared',
    });
    expect(deriveFoodPresentation('Pastries, apple, frozen')).toEqual({
      derivedDisplayName: 'Apple Pastry',
      derivedVariantLabel: 'Frozen',
    });
    expect(deriveFoodPresentation('Apple, strudel, baked')).toEqual({
      derivedDisplayName: 'Apple Strudel',
      derivedVariantLabel: 'Baked',
    });
    expect(deriveFoodPresentation('Banana, pepper, raw')).toEqual({
      derivedDisplayName: 'Banana Pepper',
      derivedVariantLabel: 'Raw',
    });
    expect(deriveFoodPresentation('Banana, pudding, prepared')).toEqual({
      derivedDisplayName: 'Banana Pudding',
      derivedVariantLabel: 'Prepared',
    });
    expect(deriveFoodPresentation('Brie, cheese')).toEqual({
      derivedDisplayName: 'Brie Cheese',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Red, onion, raw')).toEqual({
      derivedDisplayName: 'Red Onion',
      derivedVariantLabel: 'Raw',
    });
    expect(deriveFoodPresentation('Chocolate, cereal, enriched')).toEqual({
      derivedDisplayName: 'Chocolate Cereal',
      derivedVariantLabel: 'Enriched',
    });
    expect(deriveFoodPresentation('Chocolate, frosting, prepared')).toEqual({
      derivedDisplayName: 'Chocolate Frosting',
      derivedVariantLabel: 'Prepared',
    });
    expect(deriveFoodPresentation('Raw, apple')).toEqual({
      derivedDisplayName: 'Apple',
      derivedVariantLabel: 'Raw',
    });
  });

  it('derives category and product-form names from reusable vocabulary', () => {
    expect(deriveFoodPresentation('Beans, adzuki')).toEqual({
      derivedDisplayName: 'Adzuki Bean',
      derivedVariantLabel: null,
    });
    expect(
      deriveFoodPresentation('Beans, black, cooked, boiled, without salt'),
    ).toEqual({
      derivedDisplayName: 'Black Bean',
      derivedVariantLabel: 'Cooked · Boiled · Without Salt',
    });
    expect(deriveFoodPresentation('Oil, olive')).toEqual({
      derivedDisplayName: 'Olive Oil',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Oil, sesame')).toEqual({
      derivedDisplayName: 'Sesame Oil',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Sauce, pasta, spaghetti/marinara')).toEqual({
      derivedDisplayName: 'Pasta Sauce',
      derivedVariantLabel: 'Spaghetti/marinara',
    });
    expect(deriveFoodPresentation('Sauce, barbecue')).toEqual({
      derivedDisplayName: 'Barbecue Sauce',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Gravy, chicken')).toEqual({
      derivedDisplayName: 'Chicken Gravy',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Potatoes, mashed, ready-to-eat')).toEqual({
      derivedDisplayName: 'Mashed Potatoes',
      derivedVariantLabel: 'Ready-to-eat',
    });
    expect(deriveFoodPresentation('Muffins, blueberry')).toEqual({
      derivedDisplayName: 'Blueberry Muffin',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Rolls, dinner')).toEqual({
      derivedDisplayName: 'Dinner Roll',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Tomatoes, sun-dried')).toEqual({
      derivedDisplayName: 'Sun-dried Tomatoes',
      derivedVariantLabel: null,
    });
  });

  it('promotes common variety descriptors so variant-heavy foods remain distinguishable', () => {
    expect(deriveFoodPresentation('Rice, white, long grain, cooked')).toEqual({
      derivedDisplayName: 'White Rice',
      derivedVariantLabel: 'Long Grain · Cooked',
    });
    expect(deriveFoodPresentation('Rice, brown, cooked')).toEqual({
      derivedDisplayName: 'Brown Rice',
      derivedVariantLabel: 'Cooked',
    });
    expect(deriveFoodPresentation('Rice, black, unenriched, raw')).toEqual({
      derivedDisplayName: 'Black Rice',
      derivedVariantLabel: 'Unenriched · Raw',
    });
    expect(deriveFoodPresentation('Rice, jasmine, cooked')).toEqual({
      derivedDisplayName: 'Jasmine Rice',
      derivedVariantLabel: 'Cooked',
    });
    expect(deriveFoodPresentation('Apples, gala, raw')).toEqual({
      derivedDisplayName: 'Gala Apple',
      derivedVariantLabel: 'Raw',
    });
    expect(deriveFoodPresentation('Apples, green, raw')).toEqual({
      derivedDisplayName: 'Green Apple',
      derivedVariantLabel: 'Raw',
    });
    expect(deriveFoodPresentation('Milk, whole')).toEqual({
      derivedDisplayName: 'Whole Milk',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Milk, evaporated, 2% milkfat')).toEqual({
      derivedDisplayName: 'Evaporated Milk',
      derivedVariantLabel: '2% Milkfat',
    });
    expect(deriveFoodPresentation('Cheese, cheddar, shredded')).toEqual({
      derivedDisplayName: 'Cheddar Cheese',
      derivedVariantLabel: 'Shredded',
    });
    expect(deriveFoodPresentation('Vinegar, cider')).toEqual({
      derivedDisplayName: 'Cider Vinegar',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Vinegar, balsamic')).toEqual({
      derivedDisplayName: 'Balsamic Vinegar',
      derivedVariantLabel: null,
    });
  });

  it('supports product-form grammar after a USDA food-group prefix', () => {
    expect(
      deriveFoodPresentation('Fast foods, potato, french fried, frozen'),
    ).toEqual({
      derivedDisplayName: 'French Fried Potatoes',
      derivedVariantLabel: 'Fast Food · Frozen',
    });
  });

  it('recognizes modifier-only compound searches generically', () => {
    expect(isModifierOnlyDisplayNameMatch('Oatmeal Bread', 'oatmeal')).toBe(
      true,
    );
    expect(isModifierOnlyDisplayNameMatch('Chocolate Cake', 'chocolate')).toBe(
      true,
    );
    expect(
      isModifierOnlyDisplayNameMatch('Oatmeal Cookie', 'oatmeal cookie'),
    ).toBe(false);
    expect(isModifierOnlyDisplayNameMatch('Fried Egg', 'fried')).toBe(false);
    expect(isModifierOnlyDisplayNameMatch('Egg Bagel', 'egg')).toBe(true);
    expect(isModifierOnlyDisplayNameMatch('Egg Bagel', 'bagel')).toBe(false);
    expect(isPrimaryConceptDisplayNameMatch('Scrambled Egg', 'egg')).toBe(true);
    expect(isPrimaryConceptDisplayNameMatch('Egg Bread', 'egg')).toBe(false);
  });

  it('derives a cut-specific poultry display name', () => {
    expect(
      deriveFoodPresentation(
        'Chicken, broilers or fryers, breast, meat only, cooked, roasted',
      ),
    ).toEqual({
      derivedDisplayName: 'Chicken Breast',
      derivedVariantLabel: 'Meat Only · Cooked · Roasted',
    });
  });

  it('promotes common poultry portions into the primary food concept', () => {
    expect(deriveFoodPresentation('Chicken, back, meat and skin, cooked')).toEqual({
      derivedDisplayName: 'Chicken Back',
      derivedVariantLabel: 'With Skin · Cooked',
    });
    expect(deriveFoodPresentation('Chicken, dark meat, cooked')).toEqual({
      derivedDisplayName: 'Chicken Dark Meat',
      derivedVariantLabel: 'Cooked',
    });
  });

  it('promotes nested product forms into complete titles', () => {
    expect(deriveFoodPresentation('Babyfood, cereal, rice, dry fortified')).toEqual({
      derivedDisplayName: 'Rice Cereal',
      derivedVariantLabel: 'Babyfood · Dry Fortified',
    });
  });

  it('promotes reusable meat cuts and keeps preparation descriptors secondary', () => {
    expect(
      deriveFoodPresentation(
        'Beef, top round, roast, choice, cooked, roasted',
      ),
    ).toEqual({
      derivedDisplayName: 'Top Round Roast',
      derivedVariantLabel: 'Choice · Cooked · Roasted',
    });

    expect(
      deriveFoodPresentation('Beef, rib eye, steak, grilled, raw'),
    ).toEqual({
      derivedDisplayName: 'Ribeye Steak',
      derivedVariantLabel: 'Grilled · Raw',
    });

    expect(
      deriveFoodPresentation('Pork, loin, chop, boneless, cooked, roasted'),
    ).toEqual({
      derivedDisplayName: 'Pork Loin Chop',
      derivedVariantLabel: 'Boneless · Cooked · Roasted',
    });

    expect(deriveFoodPresentation('Lamb, shoulder, bone in, grilled')).toEqual(
      {
        derivedDisplayName: 'Lamb Shoulder',
        derivedVariantLabel: 'Bone-in · Grilled',
      },
    );

    expect(deriveFoodPresentation('Beef, ground, 80% lean meat, raw')).toEqual({
      derivedDisplayName: 'Ground Beef',
      derivedVariantLabel: '80% Lean Meat · Raw',
    });
  });

  it('recognizes plural and compound cut vocabulary without record-specific rules', () => {
    expect(deriveFoodPresentation('Beef, short ribs, smoked')).toEqual({
      derivedDisplayName: 'Beef Short Rib',
      derivedVariantLabel: 'Smoked',
    });

    expect(
      deriveFoodPresentation('Pork, baby back ribs, cooked, roasted'),
    ).toEqual({
      derivedDisplayName: 'Pork Baby Back Rib',
      derivedVariantLabel: 'Cooked · Roasted',
    });
  });

  it('uses natural preparation-first names for prepared eggs', () => {
    expect(deriveFoodPresentation('Egg, whole, cooked, hard-boiled')).toEqual({
      derivedDisplayName: 'Hard-boiled Egg',
      derivedVariantLabel: null,
    });

    expect(deriveFoodPresentation('Egg, whole, cooked, fried')).toEqual({
      derivedDisplayName: 'Fried Egg',
      derivedVariantLabel: null,
    });
  });

  it('removes administrative USDA text without changing the canonical name', () => {
    expect(
      deriveFoodPresentation(
        "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)",
      ),
    ).toEqual({
      derivedDisplayName: 'Apple',
      derivedVariantLabel: 'Raw · With Skin',
    });
  });

  it('keeps ordinary food nouns as the primary concept before preparation states', () => {
    expect(deriveFoodPresentation('Carrots, raw')).toEqual({
      derivedDisplayName: 'Carrots',
      derivedVariantLabel: 'Raw',
    });
    expect(deriveFoodPresentation('Carrots, cooked')).toEqual({
      derivedDisplayName: 'Carrots',
      derivedVariantLabel: 'Cooked',
    });
    expect(deriveFoodPresentation('Bananas, raw')).toEqual({
      derivedDisplayName: 'Banana',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Broccoli, steamed')).toEqual({
      derivedDisplayName: 'Broccoli',
      derivedVariantLabel: 'Steamed',
    });
    expect(deriveFoodPresentation('Spinach, frozen')).toEqual({
      derivedDisplayName: 'Spinach',
      derivedVariantLabel: 'Frozen',
    });
  });

  it('uses natural ripeness labels without changing the canonical food concept', () => {
    expect(
      deriveFoodPresentation('Bananas, ripe and slightly ripe, raw'),
    ).toEqual({
      derivedDisplayName: 'Ripe Banana',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Bananas, overripe, raw')).toEqual({
      derivedDisplayName: 'Overripe Banana',
      derivedVariantLabel: null,
    });
    expect(deriveFoodPresentation('Apples, ripe, raw')).toEqual({
      derivedDisplayName: 'Ripe Apple',
      derivedVariantLabel: null,
    });
  });

  it('keeps pure category states secondary while preserving meaningful product forms', () => {
    expect(deriveFoodPresentation('Potatoes, raw')).toEqual({
      derivedDisplayName: 'Potato',
      derivedVariantLabel: 'Raw',
    });
    expect(deriveFoodPresentation('Tomatoes, cooked')).toEqual({
      derivedDisplayName: 'Tomato',
      derivedVariantLabel: 'Cooked',
    });
    expect(deriveFoodPresentation('Potatoes, mashed')).toEqual({
      derivedDisplayName: 'Mashed Potatoes',
      derivedVariantLabel: null,
    });
  });

  it('applies overrides while retaining deterministic derived values as the fallback', () => {
    expect(
      resolveFoodPresentation(
        'Fish, salmon, Atlantic, farmed, cooked, dry heat',
        {
          displayNameOverride: 'Salmon',
          variantLabelOverride: null,
          searchPriority: 20,
          aliases: [{ alias: 'Atlantic salmon' }],
        },
      ),
    ).toEqual({
      derivedDisplayName: 'Salmon',
      derivedVariantLabel: 'Atlantic · Farmed · Cooked · Dry Heat',
      displayName: 'Salmon',
      variantLabel: 'Atlantic · Farmed · Cooked · Dry Heat',
      searchPriority: 20,
      aliases: ['Atlantic salmon'],
    });
  });

  it('normalizes opaque undetermined serving labels without changing quantities', () => {
    expect(normalizeServingDisplayName('1 undetermined, egg', 'Egg')).toBe(
      '1 Egg',
    );
    expect(
      normalizeServingDisplayName('1 undetermined, banana', 'Banana'),
    ).toBe('1 Banana');
    expect(normalizeServingDisplayName('1 undetermined', null)).toBe(
      '1 Portion',
    );
    expect(normalizeServingDisplayName('1 cup', 'Milk')).toBe('1 cup');
  });

  it('gives ordinary variants a higher deterministic search priority than specialty variants', () => {
    const ordinary = resolveFoodPresentation('Egg, whole, raw');
    const specialty = resolveFoodPresentation(
      'Egg, whole, raw, frozen, pasteurized',
    );

    expect(ordinary.searchPriority).toBeGreaterThan(specialty.searchPriority);
  });
});
