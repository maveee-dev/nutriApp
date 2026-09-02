export interface FoodRecognitionInput {
  readonly imageData: string;
  readonly mimeType: string;
}

export type FoodImageQualityStatus = 'good' | 'needs-review' | 'poor';

export interface FoodRecognitionImageQuality {
  readonly status: FoodImageQualityStatus;
  readonly issues: readonly string[];
}

export interface FoodRecognitionServingSuggestion {
  readonly label: string;
  readonly grams?: string;
}

export interface FoodRecognitionDetection {
  readonly label: string;
  readonly confidence: number;
  readonly servingSuggestion?: FoodRecognitionServingSuggestion;
}

export interface FoodRecognitionResult {
  readonly imageQuality: FoodRecognitionImageQuality;
  readonly mealConfidence: number | null;
  readonly mealDescription: string | null;
  readonly detections: readonly FoodRecognitionDetection[];
}

export interface FoodRecognitionProvider {
  readonly providerId: string;
  readonly available: boolean;
  recognize(input: FoodRecognitionInput): Promise<FoodRecognitionResult>;
}
