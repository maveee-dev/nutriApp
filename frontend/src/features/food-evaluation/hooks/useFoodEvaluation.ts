import { useMutation } from '@tanstack/react-query';
import { evaluationApi } from '../api/evaluationApi';
import type { FoodEvaluationRequest, FoodEvaluationResponse } from '../types/evaluation.types';

export const useFoodEvaluation = () => {
  return useMutation<FoodEvaluationResponse, Error, FoodEvaluationRequest>({
    mutationFn: (data: FoodEvaluationRequest) => evaluationApi.evaluateFood(data),
  });
};
