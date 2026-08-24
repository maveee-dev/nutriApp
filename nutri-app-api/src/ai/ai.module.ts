import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AiService } from './ai.service.js';
import { AI_PROVIDER, GEMINI_CLIENT } from './ai.tokens.js';
import { GeminiProvider } from './providers/gemini.provider.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: GEMINI_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => new GoogleGenAI({
        apiKey: configService.getOrThrow<string>('geminiApiKey'),
      }),
    },
    GeminiProvider,
    { provide: AI_PROVIDER, useExisting: GeminiProvider },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
