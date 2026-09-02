import { Injectable } from '@nestjs/common';
import type { FoodRecognitionInput, FoodRecognitionProvider, FoodRecognitionResult } from '../types/food-recognition-provider.type.js';

@Injectable()
export class NoopFoodRecognitionProvider implements FoodRecognitionProvider {
  readonly providerId = 'none';
  readonly available = false;

  recognize(_input: FoodRecognitionInput): Promise<FoodRecognitionResult> {
    return Promise.resolve({
      imageQuality: { status: 'poor', issues: ['Image recognition is not configured.'] },
      mealConfidence: null,
      mealDescription: null,
      detections: [],
    });
  }
}
