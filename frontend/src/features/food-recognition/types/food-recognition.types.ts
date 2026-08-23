export interface FoodRecognitionNutritionEstimate { nutrient: string; amount: string; unit: string; basis: string; }
export interface FoodRecognitionCandidate { label: string; confidence: number; foodId: string | null; foodName: string | null; matchStatus: 'database-match' | 'ai-estimate' | 'unmatched'; nutritionSource: 'canonical-database' | 'ai-estimated' | null; requiresReview: boolean; estimatedNutrition?: FoodRecognitionNutritionEstimate[]; }
export interface FoodRecognitionResponse { apiVersion: string; providerId: string; providerAvailable: boolean; candidates: FoodRecognitionCandidate[]; limitations: string[]; }
export interface FoodRecognitionRequest { imageData: string; mimeType: string; }
