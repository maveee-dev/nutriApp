import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_CLIENT } from '../../../ai/ai.tokens.js';
import type {
  FoodRecognitionDetection,
  FoodRecognitionInput,
  FoodRecognitionProvider,
  FoodRecognitionResult,
} from '../types/food-recognition-provider.type.js';

const RECOGNITION_PROMPT = `You identify visible foods in one meal photo for a nutrition app.

Return JSON only with this shape:
{
  "imageQuality": { "status": "good" | "needs-review" | "poor", "issues": string[] },
  "mealConfidence": number,
  "mealDescription": string | null,
  "detections": [{ "label": string, "confidence": number, "servingSuggestion": { "label": string, "grams": string } | null }]
}

Rules:
- List only foods visibly present; do not invent hidden ingredients.
- Confidence values must be between 0 and 1.
- Use familiar food names, including common Filipino names when visible.
- Do not return calories, nutrients, health claims, compatibility, targets, or recommendations.
- A serving suggestion is only an editable guess and must not be treated as nutrition data.
- Mark the image poor when the food cannot be recognized reliably because of blur, lighting, obstruction, or severe overlap.
- Keep the description brief and factual.
- Return at most 12 detections.`;

interface RawRecognitionResult {
  readonly imageQuality?: { readonly status?: unknown; readonly issues?: unknown };
  readonly mealConfidence?: unknown;
  readonly mealDescription?: unknown;
  readonly detections?: unknown;
}

@Injectable()
export class GeminiFoodRecognitionProvider implements FoodRecognitionProvider {
  readonly providerId: string;
  readonly available: boolean;

  constructor(
    @Inject(GEMINI_CLIENT) private readonly client: GoogleGenAI,
    private readonly configService: ConfigService,
  ) {
    const model = this.configService.get<string>('geminiModel') ?? 'gemini-3.6-flash';
    this.providerId = `gemini-vision:${model}`;
    this.available = Boolean(this.configService.get<string>('geminiApiKey'));
  }

  async recognize(input: FoodRecognitionInput): Promise<FoodRecognitionResult> {
    const response = await this.client.models.generateContent({
      model: this.configService.get<string>('geminiModel') ?? 'gemini-3.6-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: RECOGNITION_PROMPT },
          { inlineData: { data: input.imageData.replace(/^data:[^;]+;base64,/, ''), mimeType: input.mimeType } },
        ],
      }],
      config: {
        temperature: 0,
        maxOutputTokens: 900,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error('Gemini returned no food recognition result.');

    return this.parseResult(JSON.parse(text) as RawRecognitionResult);
  }

  private parseResult(raw: RawRecognitionResult): FoodRecognitionResult {
    const status = raw.imageQuality?.status;
    if (status !== 'good' && status !== 'needs-review' && status !== 'poor') {
      throw new Error('Gemini returned an invalid image quality status.');
    }

    const issues = Array.isArray(raw.imageQuality?.issues)
      ? raw.imageQuality.issues.filter((issue): issue is string => typeof issue === 'string').slice(0, 8)
      : [];
    const mealConfidence = this.confidenceOrNull(raw.mealConfidence);
    const mealDescription = typeof raw.mealDescription === 'string'
      ? raw.mealDescription.trim().slice(0, 500) || null
      : null;
    const detections = Array.isArray(raw.detections)
      ? raw.detections.slice(0, 12).map((detection) => this.parseDetection(detection)).filter((detection): detection is FoodRecognitionDetection => detection != null)
      : [];

    if (status === 'poor') {
      return { imageQuality: { status, issues }, mealConfidence, mealDescription, detections: [] };
    }

    return { imageQuality: { status, issues }, mealConfidence, mealDescription, detections };
  }

  private parseDetection(value: unknown): FoodRecognitionDetection | null {
    if (value == null || typeof value !== 'object') return null;
    const detection = value as Record<string, unknown>;
    const label = typeof detection.label === 'string' ? detection.label.trim().slice(0, 160) : '';
    const confidence = this.confidenceOrNull(detection.confidence);
    if (!label || confidence == null) return null;

    const rawSuggestion = detection.servingSuggestion;
    const suggestion = rawSuggestion != null && typeof rawSuggestion === 'object'
      ? rawSuggestion as Record<string, unknown>
      : null;
    const suggestionLabel = typeof suggestion?.label === 'string' ? suggestion.label.trim().slice(0, 100) : '';
    const suggestionGrams = typeof suggestion?.grams === 'string' ? suggestion.grams.trim().slice(0, 32) : '';

    return {
      label,
      confidence,
      ...(suggestionLabel ? {
        servingSuggestion: {
          label: suggestionLabel,
          ...(suggestionGrams ? { grams: suggestionGrams } : {}),
        },
      } : {}),
    };
  }

  private confidenceOrNull(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return null;
    return value;
  }
}
