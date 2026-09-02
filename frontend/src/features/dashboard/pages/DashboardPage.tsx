import React from 'react';
import { Activity, ArrowRight, CheckCircle2, ChevronRight, FlaskConical, HeartPulse, Info, ListChecks, Plus, TriangleAlert, UtensilsCrossed, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useHealthDashboard } from '../hooks/useHealthDashboard';
import type { HealthDashboardInsight, HealthDashboardLaboratoryResult, HealthDashboardProgress } from '../types/health-dashboard.types';

const formatAmount = (value: string | null): string => {
  if (value == null) return '—';
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed >= 100 ? Math.round(parsed).toString() : (Math.round(parsed * 10) / 10).toString();
};

const titleCase = (value: string): string => value.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

const severityIcon = (severity: string): React.ReactNode => {
  const value = severity.toLowerCase();
  return value.includes('warning') || value.includes('high') ? <TriangleAlert size={16} color="var(--color-danger)" /> : value.includes('positive') ? <CheckCircle2 size={16} color="var(--color-primary)" /> : <Info size={16} color="var(--color-info-hover)" />;
};

const statusColor = (status: HealthDashboardLaboratoryResult['status']): string => status === 'high' || status === 'low' ? 'var(--color-danger)' : status === 'normal' ? 'var(--color-primary)' : 'var(--text-muted)';

const progressPercent = (item: HealthDashboardProgress): number => item.percentageConsumed == null ? 0 : Math.min(Math.max(item.percentageConsumed, 0), 100);

export const DashboardPage: React.FC = () => {
  const dashboard = useHealthDashboard();

  if (dashboard.isLoading) return <LoadingSpinner label="Preparing your health dashboard..." />;
  if (dashboard.isError) return <EmptyState icon={<Activity size={32} />} title="Could not load your dashboard" description={dashboard.error.message} actionLabel="Try again" onAction={() => void dashboard.refetch()} />;
  if (dashboard.data == null) return <EmptyState icon={<Activity size={32} />} title="Your dashboard is not available" description="Try again in a moment." actionLabel="Refresh" onAction={() => void dashboard.refetch()} />;

  const data = dashboard.data;
  const latestLab = data.laboratorySummary;
  const importantLabs = latestLab.importantResults.length > 0 ? latestLab.importantResults : latestLab.results.slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader
        title={`${data.greeting.greeting}, ${data.greeting.displayName}`}
        subtitle="A clear view of your nutrition and health information for today."
        action={<Link to="/consultation" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', color: 'var(--text-inverse)', fontWeight: 750, fontSize: '0.82rem', textDecoration: 'none' }}>Ask NutriApp <ChevronRight size={15} /></Link>}
      />

      {(data.greeting.profileSummary.conditions.length > 0 || data.greeting.profileSummary.dialysis != null) && <Card padding="md" style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1.5px solid var(--border-light)' }}>
        <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', background: 'var(--color-primary-light)', color: 'var(--color-primary-shadow)', display: 'grid', placeItems: 'center' }}><HeartPulse size={19} /></span>
        <div><strong style={{ fontSize: '0.88rem' }}>Your health profile</strong><p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 3 }}>{[...data.greeting.profileSummary.conditions, data.greeting.profileSummary.dialysis].filter(Boolean).join(' · ')}</p></div>
      </Card>}

      {data.healthNotices.length > 0 && <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}><Info size={19} color="var(--color-info-hover)" /><h2 style={{ fontSize: '1.1rem', fontWeight: 750 }}>Health notices</h2></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{data.healthNotices.slice(0, 5).map((notice: HealthDashboardInsight) => <div key={`${notice.source}-${notice.category}-${notice.title}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-secondary)' }}>{severityIcon(notice.severity)}<div><strong style={{ display: 'block', fontSize: '0.82rem' }}>{notice.title}</strong><p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.45, marginTop: 3 }}>{notice.message}</p></div></div>)}</div>
        {data.healthNotices.length > 5 && <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 9 }}>Showing the most important notices first.</p>}
      </Card>}

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 'var(--space-md)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ListChecks size={19} color="var(--color-primary)" /><h2 style={{ fontSize: '1.1rem', fontWeight: 750 }}>Today's nutrition</h2></div><Link to="/daily-tracker" style={{ color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 700 }}>View details</Link></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 12 }}>{data.nutritionProgress.map((item) => <div key={item.nutrient} style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-secondary)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'baseline' }}><strong style={{ fontSize: '0.82rem' }}>{item.nutrient}</strong><span style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>{formatAmount(item.consumed)} {item.unit}</span></div>{item.targetConfigured ? <><div style={{ height: 8, background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginTop: 9 }}><div style={{ width: `${progressPercent(item)}%`, height: '100%', borderRadius: 'var(--radius-full)', background: 'var(--color-primary)' }} /></div><p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 5 }}>{formatAmount(item.remaining)} {item.unit} remaining</p></> : <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 9 }}>Target not configured</p>}</div>)}</div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 'var(--space-lg)' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 'var(--space-md)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FlaskConical size={19} color="var(--color-primary)" /><h2 style={{ fontSize: '1.05rem', fontWeight: 750 }}>Latest laboratory</h2></div><Link to="/laboratory" style={{ color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 700 }}>View all</Link></div>
          {latestLab.latestReport == null ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>No laboratory reports have been recorded yet.</p> : <><p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 9 }}>{latestLab.latestReport.reportDate} · {titleCase(latestLab.latestReport.source)}</p><div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{importantLabs.map((result) => <div key={result.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '9px 10px', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}><div><strong style={{ fontSize: '0.8rem' }}>{result.testName}</strong><p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>{result.status === 'normal' ? 'Within reference range' : result.status === 'unknown' ? 'Reference range unavailable' : result.status}</p></div><span style={{ color: statusColor(result.status), fontWeight: 800, fontSize: '0.82rem' }}>{formatAmount(result.value)} {result.unit}</span></div>)}</div></>}
          {latestLab.trends.length > 0 && <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-light)' }}><strong style={{ fontSize: '0.78rem' }}>Trends</strong><p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 4 }}>{latestLab.trends.slice(0, 3).map((trend) => `${trend.testName}: ${titleCase(trend.direction.replaceAll('-', ' '))}`).join(' · ')}</p></div>}
      </Card>

      {data.recipeSummary != null && (data.recipeSummary.recent.length > 0 || data.recipeSummary.today.length > 0 || data.recipeSummary.favorites.length > 0) && <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UtensilsCrossed size={19} color="var(--color-primary)" /><h2 style={{ fontSize: '1.05rem', fontWeight: 750 }}>Your recipes</h2></div>
          <Link to="/recipes" style={{ color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 700 }}>View all</Link>
        </div>
        {data.recipeSummary.today.length > 0 && <div style={{ marginBottom: 12 }}><strong style={{ fontSize: '0.78rem' }}>Today</strong><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 7 }}>{data.recipeSummary.today.map((recipe) => <Link key={`today-${recipe.recipeId}`} to={`/recipes/${recipe.recipeId}`} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 650 }}>{recipe.name}</Link>)}</div></div>}
        {data.recipeSummary.favorites.length > 0 && <div style={{ marginBottom: 12 }}><strong style={{ fontSize: '0.78rem' }}>Favorites</strong><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 7 }}>{data.recipeSummary.favorites.slice(0, 4).map((recipe) => <Link key={`favorite-${recipe.recipeId}`} to={`/recipes/${recipe.recipeId}`} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 650 }}>{recipe.name}</Link>)}</div></div>}
        {data.recipeSummary.recent.length > 0 && <div><strong style={{ fontSize: '0.78rem' }}>Recent</strong><div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 7 }}>{data.recipeSummary.recent.slice(0, 5).map((recipe) => <div key={`recent-${recipe.recipeId}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 10px', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}><Link to={`/recipes/${recipe.recipeId}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 650 }}>{recipe.name}</Link>{recipe.compatibilityScore == null ? <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Not evaluated</span> : <span style={{ color: 'var(--color-primary)', fontWeight: 750, fontSize: '0.75rem' }}>{recipe.compatibilityScore}/100</span>}</div>)}</div></div>}
        {data.recipeSummary.recentEvaluated.length > 0 && <div style={{ marginTop: 12 }}><strong style={{ fontSize: '0.78rem' }}>Recently evaluated</strong><div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 7 }}>{data.recipeSummary.recentEvaluated.slice(0, 5).map((recipe) => <div key={`evaluated-${recipe.recipeId}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 10px', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}><Link to={`/recipes/${recipe.recipeId}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 650 }}>{recipe.name}</Link><span style={{ color: 'var(--color-primary)', fontWeight: 750, fontSize: '0.75rem' }}>{recipe.compatibilityScore == null ? 'Not available' : `${recipe.compatibilityScore}/100`}</span></div>)}</div></div>}
      </Card>}

      <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 'var(--space-md)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><WandSparkles size={19} color="var(--color-primary)" /><h2 style={{ fontSize: '1.05rem', fontWeight: 750 }}>Meal idea for today</h2></div><Link to="/meal-planner" style={{ color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 700 }}>Planner</Link></div>
          {data.mealPlanner.recommendation == null ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>No meal recommendation is available right now.</p> : <><p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 9 }}>{titleCase(data.mealPlanner.recommendation.mealType)} · Based on your current intake and configured targets</p><div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{data.mealPlanner.recommendation.foods.slice(0, 3).map((food) => <div key={food.foodId} style={{ padding: '9px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-secondary)' }}><strong style={{ fontSize: '0.82rem' }}>{food.displayName}</strong>{food.variantLabel && <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>{food.variantLabel}</small>}<p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: 3 }}>{food.servingName} · Compatibility {food.score}/100</p></div>)}</div>{data.mealPlanner.recommendation.foods.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No eligible foods were found for this meal yet.</p>}</>}
        </Card>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 'var(--space-md)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UtensilsCrossed size={19} color="var(--color-primary)" /><h2 style={{ fontSize: '1.05rem', fontWeight: 750 }}>Today's foods</h2></div><Link to="/daily-tracker" style={{ color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 700 }}>Manage intake</Link></div>
        {data.dailyFoods.length === 0 ? <div style={{ padding: 'var(--space-lg)', textAlign: 'center', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Nothing logged today yet.</p><Link to="/daily-tracker" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 9, color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 700 }}>Add your first food <ArrowRight size={14} /></Link></div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{data.dailyFoods.map((food) => <div key={food.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 10px', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}><div style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{food.displayName}</strong>{food.variantLabel && <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>{food.variantLabel}</small>}<span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: 2 }}>{food.quantity} · {food.servingName} ({food.servingGrams} g)</span></div>{food.compatibilityScore == null ? <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Evaluation unavailable</span> : <span style={{ color: 'var(--color-primary)', fontWeight: 750, fontSize: '0.75rem' }}>{food.compatibilityScore}/100</span>}</div>)}</div>}
      </Card>

      <Card padding="md">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}><Activity size={18} color="var(--color-primary)" /><strong style={{ fontSize: '0.88rem' }}>Compatibility today</strong></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}><div><span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Average score</span><strong style={{ display: 'block', marginTop: 3, fontSize: '1.15rem' }}>{data.compatibilitySummary.averageScore == null ? '—' : `${data.compatibilitySummary.averageScore}/100`}</strong></div><div><span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Evaluated</span><strong style={{ display: 'block', marginTop: 3, fontSize: '1.15rem' }}>{data.compatibilitySummary.evaluated}</strong></div><div><span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Partial</span><strong style={{ display: 'block', marginTop: 3, fontSize: '1.15rem' }}>{data.compatibilitySummary.partiallyEvaluated}</strong></div><div><span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Needs evidence</span><strong style={{ display: 'block', marginTop: 3, fontSize: '1.15rem' }}>{data.compatibilitySummary.insufficientEvidence}</strong></div></div>
      </Card>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link to="/daily-tracker" style={{ textDecoration: 'none' }}><Button variant="secondary" size="sm" leftIcon={<Plus size={15} />}>Log Food</Button></Link>
        <Link to="/meal-planner" style={{ textDecoration: 'none' }}><Button variant="secondary" size="sm" leftIcon={<WandSparkles size={15} />}>Meal Planner</Button></Link>
        <Link to="/laboratory" style={{ textDecoration: 'none' }}><Button variant="secondary" size="sm" leftIcon={<FlaskConical size={15} />}>Laboratory</Button></Link>
        <Link to="/health" style={{ textDecoration: 'none' }}><Button variant="secondary" size="sm" leftIcon={<HeartPulse size={15} />}>Health Profile</Button></Link>
      </div>
    </div>
  );
};
