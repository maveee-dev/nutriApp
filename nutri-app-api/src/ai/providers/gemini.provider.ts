import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_CLIENT } from '../ai.tokens.js';
import type { AiResponse } from '../dto/ai-response.dto.js';
import type { ConsultationPrompt } from '../dto/consultation-prompt.dto.js';
import { AiProviderUnavailableError } from '../exceptions/ai-provider-unavailable.error.js';
import { buildConsultationPrompt } from '../prompts/consultation.prompt.js';
import type { AiProvider } from './ai-provider.js';

@Injectable()
export class GeminiProvider implements AiProvider {
  constructor(
    @Inject(GEMINI_CLIENT) private readonly client: GoogleGenAI,
    private readonly configService: ConfigService,
  ) {}

  async generateConsultation(request: ConsultationPrompt): Promise<AiResponse> {
    const model = this.configService.get<string>('geminiModel') ?? 'gemini-3.6-flash';
    const response = await this.client.models.generateContent({
      model,
      contents: buildConsultationPrompt(request),
      config: {
        temperature: 0.1,
        maxOutputTokens: 700,
      },
    });
    const answer = response.text?.trim();

    if (answer == null || answer.length === 0) {
      throw new AiProviderUnavailableError('Gemini returned no consultation text.');
    }

    return {
      answer,
      providerId: `gemini:${model}`,
    };
  }
}
