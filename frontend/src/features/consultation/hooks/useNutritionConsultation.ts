import { useMutation } from '@tanstack/react-query';
import { consultationApi } from '../api/consultationApi';
import type { NutritionConsultationRequest } from '../types/consultation.types';

export const useNutritionConsultation = () => useMutation({ mutationFn: (request: NutritionConsultationRequest) => consultationApi.ask(request) });
