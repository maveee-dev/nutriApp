export interface FoodRecognitionInput {
  readonly imageData: string;
  readonly mimeType: string;
}

export interface FoodRecognitionDetection {
  readonly label: string;
  readonly confidence: number;
  readonly estimatedNutrition?: readonly { nutrient: string; amount: string; unit: string; basis: string }[];
}

export interface FoodRecognitionProvider {
  readonly providerId: string;
  readonly available: boolean;
  recognize(input: FoodRecognitionInput): Promise<readonly FoodRecognitionDetection[]>;
}
