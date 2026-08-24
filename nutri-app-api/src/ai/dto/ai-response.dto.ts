export interface AiResponse {
  readonly answer: string;
  readonly providerId: string;
  readonly refused?: boolean;
}
