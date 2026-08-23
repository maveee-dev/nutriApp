import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DailyTargetCard } from '../components/DailyTargetCard';
import { NutrientTotalsGrid } from '../components/NutrientTotalsGrid';
import { ClinicalInsightsList } from '../components/ClinicalInsightsList';
import { PolicyDeferralCallout } from '../components/PolicyDeferralCallout';
import { MealLogModal } from '@/features/meals/components/MealLogModal';
import { useDailyNutrition } from '../hooks/useDailyNutrition';
import { useDailyRecommendations } from '../hooks/useDailyRecommendations';
import { DailyCoachingCard } from '../components/DailyCoachingCard';
import { DailyMealPlanCard } from '../components/DailyMealPlanCard';
import { ProfileCompletionSummary } from '@/features/health/components/ProfileCompletionSummary';
import { useMeals } from '@/features/meals/hooks/useMeals';
import { Plus, ChevronLeft, ChevronRight, UtensilsCrossed, ArrowRight, MessageCircle } from 'lucide-react';
import { format, subDays, addDays, isToday, parseISO } from 'date-fns';

export const TodayPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const { data: dailyData, isLoading: isDailyLoading } = useDailyNutrition(selectedDate);
  const { data: recommendationData, isLoading: isRecommendationLoading, error: recommendationError } = useDailyRecommendations(selectedDate);
  const { data: mealsData } = useMeals({
    search: undefined,
    limit: 20,
    sortBy: 'consumedAt',
    sortOrder: 'desc',
  });

  const handlePrevDay = () => {
    const prev = subDays(parseISO(selectedDate), 1);
    setSelectedDate(format(prev, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const next = addDays(parseISO(selectedDate), 1);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  };

  const handleResetToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const currentDateObj = parseISO(selectedDate);
  const isDateToday = isToday(currentDateObj);
  const formattedHeaderDate = format(currentDateObj, 'EEEE, MMMM d');

  // Filter today's logged meals
  const todaysMeals = (mealsData?.items || []).filter((m) => {
    try {
      return format(parseISO(m.consumedAt), 'yyyy-MM-dd') === selectedDate;
    } catch {
      return false;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Date Navigation & Primary Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isDateToday ? 'Today' : 'Nutrition Overview'}
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {formattedHeaderDate}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--border-light)',
                padding: '3px',
              }}
            >
              <button
                type="button"
                onClick={handlePrevDay}
                title="Previous Day"
                style={{
                  background: 'none',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <ChevronLeft size={18} />
              </button>

              {!isDateToday && (
                <button
                  type="button"
                  onClick={handleResetToday}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0 8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Today
                </button>
              )}

              <button
                type="button"
                onClick={handleNextDay}
                title="Next Day"
                style={{
                  background: 'none',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <Button
              variant="primary"
              onClick={() => setIsLogModalOpen(true)}
              leftIcon={<Plus size={18} />}
            >
              Log Meal
            </Button>
            <Link
              to="/consultation"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: 'var(--radius-full)', border: '1.5px solid var(--border-light)', backgroundColor: 'var(--bg-surface)', color: 'var(--color-primary)', fontSize: '0.82rem', fontWeight: 700 }}
            >
              <MessageCircle size={16} /> Ask NutriApp
            </Link>
          </div>
        </div>
      </div>

      <ProfileCompletionSummary compact maxActions={3} />

      {isDailyLoading ? (
        <LoadingSpinner label="Compiling your daily nutrition summary..." />
      ) : dailyData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Missing Clinical Evidence / Policy Deferrals (if any) */}
          <PolicyDeferralCallout deferredPolicies={dailyData.deferredPolicies} />

          <DailyCoachingCard resolution={recommendationData} isLoading={isRecommendationLoading} error={recommendationError} />

          <DailyMealPlanCard date={selectedDate} />

          {/* Daily Health Targets (Sodium & Protein) */}
          <DailyTargetCard targets={dailyData.targets} totals={dailyData.totals} targetProvenance={dailyData.targetProvenance} diabetesCarbohydrateAdherence={dailyData.diabetesCarbohydrateAdherence} deferredPolicies={dailyData.deferredPolicies} evaluationMode={dailyData.evaluationMode} policySetFingerprints={dailyData.policySetFingerprints} />

          {/* Personalized Insights from Backend */}
          <ClinicalInsightsList insights={dailyData.insights} />

          {/* All Nutrients Consumed Today Grid */}
          <NutrientTotalsGrid totals={dailyData.totals} />

          {/* Today's Meals Section */}
          <Card style={{ border: '1.5px solid var(--border-light)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary-shadow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UtensilsCrossed size={18} />
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  Meals Logged for {isDateToday ? 'Today' : formattedHeaderDate}
                </h2>
              </div>

              <Link
                to="/meals"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                }}
              >
                View all meals <ArrowRight size={16} />
              </Link>
            </div>

            {todaysMeals.length === 0 ? (
              <div
                style={{
                  padding: 'var(--space-lg)',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                  No meals logged for this date yet.
                </p>
                <Button variant="secondary" size="sm" onClick={() => setIsLogModalOpen(true)} leftIcon={<Plus size={16} />}>
                  Log a Meal for this Day
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {todaysMeals.map((meal) => (
                  <div
                    key={meal.id}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-surface-secondary)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {meal.mealType.charAt(0) + meal.mealType.slice(1).toLowerCase()}
                      </span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {meal.itemCount} {meal.itemCount === 1 ? 'item' : 'items'} logged
                      </p>
                    </div>

                    <Link
                      to="/meals"
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                      }}
                    >
                      Details
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {/* Log Meal Modal */}
      <MealLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />
    </div>
  );
};
