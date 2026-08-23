import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useWeeklyNutrition } from '../hooks/useWeeklyNutrition';
import { ChevronLeft, ChevronRight, BarChart3, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format, subDays, addDays, parseISO } from 'date-fns';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export const TrendsPage: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(() => {
    return format(subDays(new Date(), 6), 'yyyy-MM-dd');
  });

  const { data, isLoading, error } = useWeeklyNutrition(startDate);

  const handlePrevWeek = () => {
    const prev = subDays(parseISO(startDate), 7);
    setStartDate(format(prev, 'yyyy-MM-dd'));
  };

  const handleNextWeek = () => {
    const next = addDays(parseISO(startDate), 7);
    setStartDate(format(next, 'yyyy-MM-dd'));
  };

  const days = data?.days || [];

  // Prepare chart dataset
  const chartData = days.map((day) => {
    const sodiumItem = day.totals.find((t) => t.name.toLowerCase().includes('sodium'));
    const sodiumVal = sodiumItem ? Math.round(parseFloat(sodiumItem.amount)) : 0;
    const targetSodium = Math.round(parseFloat(day.targets.sodiumMilligrams)) || 2000;

    let dayLabel = day.date;
    try {
      dayLabel = format(parseISO(day.date), 'EEE (M/d)');
    } catch {}

    return {
      date: day.date,
      dayLabel,
      sodium: sodiumVal,
      targetSodium,
      mealCount: day.mealCount,
    };
  });

  const targetSodiumLimit = chartData[0]?.targetSodium || 2000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader
        title="Weekly Trends"
        subtitle="Review your nutrient patterns and consistency over time."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Button variant="secondary" size="sm" onClick={handlePrevWeek} title="Previous Week">
              <ChevronLeft size={16} />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleNextWeek} title="Next Week">
              <ChevronRight size={16} />
            </Button>
          </div>
        }
      />

      {/* Date Range Banner */}
      <Card style={{ padding: 'var(--space-md) var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <Calendar size={18} color="var(--color-primary)" />
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            {data ? `${data.startDate} — ${data.endDate}` : '7-Day Window'}
          </span>
        </div>
      </Card>

      {isLoading ? (
        <LoadingSpinner label="Compiling weekly nutrition trends..." />
      ) : error ? (
        <EmptyState
          icon={<BarChart3 size={32} />}
          title="Could not load trends"
          description={error.message}
        />
      ) : days.length === 0 ? (
        <EmptyState
          icon={<BarChart3 size={32} />}
          title="No data for this week"
          description="Log meals to see your weekly nutrition intake charts."
        />
      ) : (
        <>
          {/* Sodium Intake Chart */}
          <Card style={{ border: '1.5px solid var(--border-light)' }}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Daily Sodium Intake vs Target (mg)</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Target limit: {targetSodiumLimit} mg/day
              </p>
            </div>

            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="dayLabel" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-light)',
                      boxShadow: 'var(--shadow-md)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  />
                  <ReferenceLine
                    y={targetSodiumLimit}
                    stroke="var(--color-accent)"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Target Limit',
                      position: 'top',
                      fill: 'var(--color-accent-shadow)',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />
                  <Bar
                    dataKey="sodium"
                    fill="var(--color-primary)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Day by Day Summary Cards */}
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
              Day-by-Day Breakdown
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 'var(--space-md)',
              }}
            >
              {days.map((day) => {
                const sodiumItem = day.totals.find((t) => t.name.toLowerCase().includes('sodium'));
                const sodiumAmount = sodiumItem ? Math.round(parseFloat(sodiumItem.amount)) : 0;
                const sodiumTarget = Math.round(parseFloat(day.targets.sodiumMilligrams)) || 2000;
                const isOver = sodiumAmount > sodiumTarget;

                let formattedDay = day.date;
                try {
                  formattedDay = format(parseISO(day.date), 'EEEE, MMM d');
                } catch {}

                return (
                  <Card key={day.date} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formattedDay}</span>
                      {day.mealCount === 0 ? (
                        <Badge variant="neutral" size="sm">No logs</Badge>
                      ) : isOver ? (
                        <Badge variant="danger" size="sm" icon={<AlertTriangle size={12} />}>Over Target</Badge>
                      ) : (
                        <Badge variant="success" size="sm" icon={<CheckCircle2 size={12} />}>On Track</Badge>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>Meals Logged:</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{day.mealCount}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>Sodium:</span>
                      <span style={{ fontWeight: 700, color: isOver ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {sodiumAmount} / {sodiumTarget} mg
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
