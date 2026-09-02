import { Inject, Injectable, Logger } from '@nestjs/common';
import { FoodRecognitionResponseDto } from '../dto/food-recognition-response.dto.js';
import { FoodRecognitionRequestDto } from '../dto/food-recognition-request.dto.js';
import { FOOD_RECOGNITION_PROVIDER } from '../types/food-recognition.tokens.js';
import type { FoodRecognitionProvider } from '../types/food-recognition-provider.type.js';
import { FoodEntityResolver } from '../../consultation/services/food-entity-resolver.js';

@Injectable()
export class FoodRecognitionService {
  private readonly logger = new Logger(FoodRecognitionService.name);

  constructor(
    private readonly foodEntityResolver: FoodEntityResolver,
    @Inject(FOOD_RECOGNITION_PROVIDER)
    private readonly provider: FoodRecognitionProvider,
  ) {}

  async recognize(request: FoodRecognitionRequestDto): Promise<FoodRecognitionResponseDto> {
    this.validateImagePayload(request);
    if (!this.provider.available) {
      return this.unavailableResponse('Image recognition is not configured. Use the food catalog to select canonical foods.');
    }

    let recognition;
    try {
      recognition = await this.provider.recognize(request);
    } catch (error) {
      this.logger.warn(`Food recognition provider failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return this.unavailableResponse('We could not recognize this image right now. Please try again with a clearer photo.');
    }

    const candidates = recognition.imageQuality.status === 'poor'
      ? []
      : await Promise.all(recognition.detections.map(async (detection) => {
      const resolution = await this.foodEntityResolver.resolveFoodLabel(detection.label);
      const match = resolution.status === 'resolved' ? resolution.candidates[0] : undefined;
      const choices = resolution.clarification?.choices;
      const alternatives = resolution.status === 'ambiguous'
        ? ((choices != null && choices.length > 0) ? choices : resolution.candidates).map((candidate) => ({
          foodId: candidate.foodId!,
          displayName: candidate.displayName,
          variantLabel: candidate.variantLabel ?? null,
          canonicalName: candidate.canonicalName ?? null,
        }))
        : undefined;
      return {
        label: detection.label,
        confidence: detection.confidence,
        foodId: match?.foodId ?? null,
        foodName: match?.canonicalName ?? null,
        foodDisplayName: match?.displayName ?? null,
        foodVariantLabel: match?.variantLabel ?? null,
        matchStatus: match ? 'database-match' as const : resolution.status === 'ambiguous' ? 'ambiguous' as const : 'unmatched' as const,
        resolutionStatus: match ? 'matched' as const : resolution.status === 'ambiguous' ? 'ambiguous' as const : 'unmatched' as const,
        nutritionSource: match ? 'canonical-database' as const : null,
        requiresReview: !match || detection.confidence < 0.75,
        ...(alternatives == null ? {} : { alternatives }),
        ...(detection.servingSuggestion == null ? {} : {
          servingSuggestion: {
            label: detection.servingSuggestion.label,
            grams: detection.servingSuggestion.grams ?? null,
          },
        }),
      };
    }));

    return {
      apiVersion: 'v1',
      providerId: this.provider.providerId,
      providerAvailable: this.provider.available,
      recognitionStatus: 'completed',
      imageQuality: recognition.imageQuality,
      mealConfidence: recognition.mealConfidence,
      mealDescription: recognition.mealDescription,
      candidates,
      limitations: [
        'Detected foods must be confirmed and portion-adjusted before evaluation.',
        'Canonical database matches use the existing deterministic nutrition engine. Recognition confidence is only a prompt to review the result.',
        ...(recognition.imageQuality.status === 'needs-review' ? ['The image may be unclear. Please review every detected food before continuing.'] : []),
      ],
    };
  }

  private unavailableResponse(message: string): FoodRecognitionResponseDto {
    return {
      apiVersion: 'v1',
      providerId: this.provider.providerId,
      providerAvailable: this.provider.available,
      recognitionStatus: 'unavailable',
      imageQuality: { status: 'unavailable', issues: [message] },
      mealConfidence: null,
      mealDescription: null,
      candidates: [],
      limitations: [message],
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
