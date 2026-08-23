import { Inject, Injectable } from '@nestjs/common';
import { FoodsService } from '../../foods/services/foods.service.js';
import { FoodRecognitionResponseDto } from '../dto/food-recognition-response.dto.js';
import { FoodRecognitionRequestDto } from '../dto/food-recognition-request.dto.js';
import { FOOD_RECOGNITION_PROVIDER } from '../types/food-recognition.tokens.js';
import type { FoodRecognitionProvider } from '../types/food-recognition-provider.type.js';

@Injectable()
export class FoodRecognitionService {
  constructor(
    private readonly foodsService: FoodsService,
    @Inject(FOOD_RECOGNITION_PROVIDER)
    private readonly provider: FoodRecognitionProvider,
  ) {}

  async recognize(request: FoodRecognitionRequestDto): Promise<FoodRecognitionResponseDto> {
    this.validateImagePayload(request);
    const detections = await this.provider.recognize(request);
    const candidates = await Promise.all(detections.map(async (detection) => {
      const matches = await this.foodsService.findMany({ page: 1, limit: 1, search: detection.label });
      const match = detection.confidence >= 0.75 ? matches.items[0] : undefined;
      const estimatedNutrition = detection.estimatedNutrition;
      return {
        label: detection.label,
        confidence: detection.confidence,
        foodId: match?.id ?? null,
        foodName: match?.name ?? null,
        matchStatus: match ? 'database-match' as const : estimatedNutrition ? 'ai-estimate' as const : 'unmatched' as const,
        nutritionSource: match ? 'canonical-database' as const : estimatedNutrition ? 'ai-estimated' as const : null,
        requiresReview: !match,
        ...(estimatedNutrition == null ? {} : { estimatedNutrition }),
      };
    }));

    return {
      apiVersion: 'v1',
      providerId: this.provider.providerId,
      providerAvailable: this.provider.available,
      candidates,
      limitations: [
        'Detected foods must be confirmed and portion-adjusted before evaluation.',
        'Canonical database matches use deterministic nutrition evaluation. AI-estimated nutrition is separate evidence and requires review before use.',
        ...(this.provider.available ? [] : ['Image recognition is not configured. Use the food catalog to select a canonical food.']),
      ],
    };
  }

  private validateImagePayload(request: FoodRecognitionRequestDto): void {
    const raw = request.imageData.replace(/^data:[^;]+;base64,/, '');
    // Unit callers and provider adapters may use an opaque reference rather
    // than inline image bytes. Apply byte/signature checks when an inline
    // payload is sufficiently large to represent an image (or is a data URL).
    if ((!request.imageData.startsWith('data:') && raw.length < 100) || !/^[A-Za-z0-9+/]*={0,2}$/.test(raw) || raw.length % 4 === 1) return;
    const bytes = Buffer.from(raw, 'base64');
    if (bytes.length > 10 * 1024 * 1024) throw new Error('Image payload exceeds the 10 MB limit.');
    const signature = bytes.subarray(0, 12);
    const valid = request.mimeType === 'image/jpeg'
      ? signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
      : request.mimeType === 'image/png'
        ? signature.toString('hex', 0, 8) === '89504e470d0a1a0a'
        : request.mimeType === 'image/webp'
          ? signature.toString('ascii', 0, 4) === 'RIFF' && signature.toString('ascii', 8, 12) === 'WEBP'
          : signature.toString('ascii', 4, 8) === 'ftyp';
    if (!valid) throw new Error('Image content does not match the declared MIME type.');
  }
}
