import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { MealsPage } from '@/features/meals/pages/MealsPage';
import { FoodsPage } from '@/features/foods/pages/FoodsPage';
import { TrendsPage } from '@/features/analytics/pages/TrendsPage';
import { HealthPage } from '@/features/health/pages/HealthPage';
import { OnboardingPage } from '@/features/health/pages/OnboardingPage';
import { ConsultationPage } from '@/features/consultation/pages/ConsultationPage';
import { FoodRecognitionPage } from '@/features/food-recognition/pages/FoodRecognitionPage';
import { NutritionTargetsPage } from '@/features/health/pages/NutritionTargetsPage';
import { DailyNutritionPage } from '@/features/daily-tracker/pages/DailyNutritionPage';
import { MealPlannerPage } from '@/features/meal-planner/pages/MealPlannerPage';
import { LaboratoryPage } from '@/features/laboratory/pages/LaboratoryPage';
import { RecommendationsPage } from '@/features/recommendations/pages/RecommendationsPage';
import { RecipesPage } from '@/features/recipes/pages/RecipesPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Guest Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/meals" element={<MealsPage />} />
          <Route path="/foods" element={<FoodsPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/laboratory" element={<LaboratoryPage />} />
          <Route path="/nutrition-targets" element={<NutritionTargetsPage />} />
          <Route path="/daily-tracker" element={<DailyNutritionPage />} />
          <Route path="/meal-planner" element={<MealPlannerPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/consultation" element={<ConsultationPage />} />
          <Route path="/food-recognition" element={<FoodRecognitionPage />} />
        </Route>
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
