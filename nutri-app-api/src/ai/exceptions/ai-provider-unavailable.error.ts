export class AiProviderUnavailableError extends Error {
  constructor(message = 'The AI consultation provider is currently unavailable.') {
    super(message);
    this.name = 'AiProviderUnavailableError';
  }
}
