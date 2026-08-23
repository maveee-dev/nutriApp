import { useMutation } from '@tanstack/react-query';
import { foodRecognitionApi } from '../api/foodRecognitionApi';
import type { FoodRecognitionRequest } from '../types/food-recognition.types';
export const useFoodRecognition = () => useMutation({ mutationFn: (request: FoodRecognitionRequest) => foodRecognitionApi.recognize(request) });
