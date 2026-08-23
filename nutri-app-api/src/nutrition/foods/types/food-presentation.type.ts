export interface FoodPresentationMetadata {
  readonly displayNameOverride?: string | null;
  readonly variantLabelOverride?: string | null;
  readonly searchPriority?: number;
  readonly aliases?: readonly {
    readonly alias: string;
    readonly normalizedAlias?: string;
    readonly priority?: number;
  }[];
}

export interface FoodPresentationView {
  readonly derivedDisplayName: string;
  readonly derivedVariantLabel: string | null;
  readonly displayName: string;
  readonly variantLabel: string | null;
  readonly searchPriority: number;
  readonly aliases: readonly string[];
}
