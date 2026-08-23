export interface UsdaFoodDataRecord {
  readonly fdcId: number | string;
  readonly dataType?: string;
  readonly description?: string;
  readonly foodCategory?: string | UsdaFoodCategoryRecord;
  readonly foodNutrients?: readonly UsdaFoodNutrientRecord[];
  readonly foodPortions?: readonly UsdaFoodPortionRecord[];
  readonly servingSize?: number | string;
  readonly servingSizeUnit?: string;
  readonly householdServingFullText?: string;
}

export interface UsdaFoodNutrientRecord {
  readonly nutrient?: UsdaNutrientRecord;
  readonly nutrientId?: number | string;
  readonly nutrientName?: string;
  readonly unitName?: string;
  readonly value?: number | string | null;
  readonly amount?: number | string | null;
}

export interface UsdaNutrientRecord {
  readonly id?: number | string;
  readonly name?: string;
  readonly unitName?: string;
}

export interface UsdaFoodCategoryRecord {
  readonly id?: number | string;
  readonly code?: string;
  readonly description?: string;
  readonly name?: string;
}

export interface UsdaFoodPortionRecord {
  readonly portionDescription?: string;
  readonly gramWeight?: number | string;
  readonly value?: number | string;
  readonly amount?: number | string;
  readonly modifier?: string;
  readonly measureUnit?: { readonly name?: string; readonly abbreviation?: string };
}

export interface ImportedFoodRecord {
  readonly source: 'usda-fdc';
  readonly sourceId: string;
  readonly name: string;
  readonly category: { readonly sourceId: string; readonly name: string };
  readonly nutrients: readonly {
    readonly sourceId: string;
    readonly name: string;
    readonly unit: string;
    readonly amountPer100Grams: string;
  }[];
  readonly servings: readonly { readonly name: string; readonly grams: string }[];
}

export interface ImportIssue {
  readonly sourceId: string;
  readonly message: string;
}
