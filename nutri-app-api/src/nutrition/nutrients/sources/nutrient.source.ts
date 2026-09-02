export interface NutrientSource {
  readonly id: string;
  /** Internal source identity used for calculation input precedence. */
  readonly sourceId?: string | null;
  readonly name: string;
  readonly unit: string;
  readonly description: string | null;
}
