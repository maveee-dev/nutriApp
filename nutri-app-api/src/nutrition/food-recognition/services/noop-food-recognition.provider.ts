import { Injectable } from '@nestjs/common';
import type { FoodRecognitionInput, FoodRecognitionProvider, FoodRecognitionDetection } from '../types/food-recognition-provider.type.js';

@Injectable()
export class NoopFoodRecognitionProvider implements FoodRecognitionProvider {
  readonly providerId = 'none';
  readonly available = false;

  recognize(_input: FoodRecognitionInput): Promise<readonly FoodRecognitionDetection[]> {
    return Promise.resolve([]);
  }
}
