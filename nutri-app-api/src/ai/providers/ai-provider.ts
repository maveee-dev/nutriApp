import type { AiResponse } from '../dto/ai-response.dto.js';
import type { ConsultationPrompt } from '../dto/consultation-prompt.dto.js';

export interface AiProvider {
  generateConsultation(request: ConsultationPrompt): Promise<AiResponse>;
}
