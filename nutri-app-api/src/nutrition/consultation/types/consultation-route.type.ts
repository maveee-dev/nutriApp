export type NutritionConsultationLane =
  | 'creator'
  | 'food'
  | 'meal-progress'
  | 'lab-evidence'
  | 'recommendation'
  | 'education'
  | 'calculation'
  | 'unrelated';

export type ConsultationAiPolicy = 'never' | 'optional';

export interface NutritionConsultationRoute {
  readonly lane: NutritionConsultationLane;
  readonly aiPolicy: ConsultationAiPolicy;
  readonly normalizedQuestion: string;
}
