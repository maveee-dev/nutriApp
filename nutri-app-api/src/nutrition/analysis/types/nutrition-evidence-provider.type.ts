export interface NutritionEvidenceProvider<TSlice = unknown> {
  readonly key: string;
  load(userId: string): Promise<TSlice>;
}

export type NutritionEvidenceSlices = Readonly<Record<string, unknown>>;

export function requireEvidenceSlice<TSlice>(evidence: NutritionEvidenceSlices, key: string): TSlice {
  const slice = evidence[key];
  if (slice == null) throw new Error(`Nutrition evidence slice '${key}' is not registered.`);
  return slice as TSlice;
}
