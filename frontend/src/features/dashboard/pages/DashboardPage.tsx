import React from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  Info,
  Lightbulb,
  MessageCircle,
  Plus,
  Search,
  TriangleAlert,
  UtensilsCrossed,
  WandSparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { NutritionContextLinks } from '@/components/layout/NutritionContextLinks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useHealthDashboard } from '../hooks/useHealthDashboard';
import type {
  HealthDashboardDailyFood,
  HealthDashboardGreeting,
  HealthDashboardInsight,
  HealthDashboardLaboratorySummary,
  HealthDashboardLaboratoryResult,
  HealthDashboardProgress,
  HealthDashboardRecipeSummary,
  HealthDashboardRecommendation,
} from '../types/health-dashboard.types';
import './dashboard.css';

const formatAmount = (value: string | null | undefined): string => {
  if (value == null) return 'Not available';
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed >= 100 ? Math.round(parsed).toString() : (Math.round(parsed * 10) / 10).toString();
};

const titleCase = (value: string): string => value.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

const formatDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
};

const progressPercent = (item: HealthDashboardProgress): number => item.percentageConsumed == null ? 0 : Math.min(Math.max(item.percentageConsumed, 0), 100);

const severityIcon = (severity: string): React.ReactNode => {
  const value = severity.toLowerCase();
  if (value.includes('warning') || value.includes('high')) return <TriangleAlert size={16} color="var(--color-danger)" aria-hidden="true" />;
  if (value.includes('positive')) return <CheckCircle2 size={16} color="var(--color-primary)" aria-hidden="true" />;
  return <Info size={16} color="var(--color-info-hover)" aria-hidden="true" />;
};

const statusColor = (status: HealthDashboardLaboratoryResult['status']): string => {
  if (status === 'high' || status === 'low') return 'var(--color-danger)';
  if (status === 'normal') return 'var(--color-primary)';
  return 'var(--text-muted)';
};

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ title, subtitle, icon, action }) => (
  <div className="dashboard-section-heading">
    <div>
      <div className="dashboard-section-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {subtitle && <p className="dashboard-section-subtitle">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const DashboardWelcome: React.FC<{ greeting: HealthDashboardGreeting }> = ({ greeting }) => {
  const title = greeting.displayName.toLowerCase() === 'there' ? greeting.greeting : `${greeting.greeting}, ${greeting.displayName}`;
  const profileItems = [...greeting.profileSummary.conditions, greeting.profileSummary.dialysis].filter((item): item is string => Boolean(item));

  return (
    <section className="dashboard-welcome" aria-labelledby="dashboard-welcome-title">
      <div>
        <p className="dashboard-eyebrow">Your daily overview</p>
        <h1 id="dashboard-welcome-title">{title}</h1>
        <p className="dashboard-welcome-copy">See how you are doing today, review anything that needs attention, and choose your next helpful step.</p>
        {profileItems.length > 0 && <div className="dashboard-profile-pills" aria-label="Health profile summary">{profileItems.map((item) => <span key={item} className="dashboard-profile-pill">{item}</span>)}</div>}
      </div>
      <time className="dashboard-date" dateTime={greeting.date}>{formatDate(greeting.date)}</time>
    </section>
  );
};

const HealthNotices: React.FC<{ notices: readonly HealthDashboardInsight[] }> = ({ notices }) => {
  if (notices.length === 0) return null;
  return (
    <Card className="dashboard-section" aria-labelledby="dashboard-health-notices-title">
      <SectionHeading
        title="Health notices"
        subtitle="The most important items are shown first."
        icon={<Info size={19} color="var(--color-info-hover)" aria-hidden="true" />}
        action={<Link className="dashboard-inline-link" to="/health">View health profile <ChevronRight size={15} aria-hidden="true" /></Link>}
      />
      <div className="dashboard-notice-list" id="dashboard-health-notices-title">
        {notices.slice(0, 3).map((notice) => <div key={`${notice.source}-${notice.category}-${notice.title}`} className="dashboard-notice">{severityIcon(notice.severity)}<div><strong>{notice.title}</strong><p>{notice.message}</p></div></div>)}
      </div>
      {notices.length > 3 && <p className="dashboard-section-subtitle">Showing the 3 most important notices.</p>}
    </Card>
  );
};

const ProgressCard: React.FC<{ item: HealthDashboardProgress }> = ({ item }) => (
  <div className="dashboard-progress-card">
    <div className="dashboard-progress-card-header">
      <strong>{item.nutrient}</strong>
      <span className="dashboard-progress-amount">{formatAmount(item.consumed)} {item.unit}</span>
    </div>
    {item.targetConfigured ? <>
      <div className="dashboard-progress-track" role="progressbar" aria-label={`${item.nutrient} consumed`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent(item)}>
        <div className="dashboard-progress-fill" style={{ width: `${progressPercent(item)}%` }} />
      </div>
      <p className="dashboard-progress-meta">{formatAmount(item.remaining)} {item.unit} remaining of {formatAmount(item.target)} {item.unit}</p>
    </> : <p className="dashboard-progress-meta">Target not configured</p>}
  </div>
);

const NutritionSummary: React.FC<{ progress: readonly HealthDashboardProgress[] }> = ({ progress }) => {
  const configured = progress.filter((item) => item.targetConfigured);
  const visible = configured.length > 0 ? configured : progress;
  const intakeOnly = configured.length > 0 ? progress.filter((item) => !item.targetConfigured) : [];

  return (
    <Card className="dashboard-section" aria-labelledby="dashboard-nutrition-title">
      <SectionHeading
        title="Today's nutrition"
        subtitle={configured.length > 0 ? 'Progress is shown for targets recorded in your profile.' : 'Your intake is visible even when a target has not been configured.'}
        icon={<ClipboardList size={19} color="var(--color-primary)" aria-hidden="true" />}
        action={<Link className="dashboard-inline-link" to="/daily-tracker">View today's nutrition <ChevronRight size={15} aria-hidden="true" /></Link>}
      />
      <div className="dashboard-progress-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 'var(--space-xs)' }}>
        {visible.map((item) => <ProgressCard key={item.nutrient} item={item} />)}
      </div>
      {intakeOnly.length > 0 && <div className="dashboard-intake-only">
        <div className="dashboard-intake-only-copy"><strong>Intake only</strong><p>These nutrients are tracked, but no personal target is recorded yet.</p></div>
        <div className="dashboard-intake-only-list">{intakeOnly.map((item) => <span key={item.nutrient} className="dashboard-intake-only-item">{item.nutrient}: {formatAmount(item.consumed)} {item.unit}</span>)}</div>
      </div>}
      {progress.length === 0 && <div className="dashboard-empty"><p>No nutrition progress is available yet.</p><Link to="/daily-tracker">Open Daily Nutrition <ArrowRight size={14} aria-hidden="true" /></Link></div>}
    </Card>
  );
};

const MealsSummary: React.FC<{ foods: readonly HealthDashboardDailyFood[] }> = ({ foods }) => {
  const recipeCount = foods.filter((food) => food.recipeId != null).length;
  const foodCount = foods.filter((food) => food.foodId != null).length;

  return (
    <Card className="dashboard-section" aria-labelledby="dashboard-meals-title">
      <SectionHeading
        title="Today's meals"
        subtitle="A quick look at what you have logged today."
        icon={<UtensilsCrossed size={19} color="var(--color-primary)" aria-hidden="true" />}
        action={<Link className="dashboard-inline-link" to="/daily-tracker">View today's nutrition <ChevronRight size={15} aria-hidden="true" /></Link>}
      />
      <div className="dashboard-meal-stats" id="dashboard-meals-title">
        <div className="dashboard-stat"><strong>{foods.length}</strong><span>Logged items</span></div>
        <div className="dashboard-stat"><strong>{foodCount}</strong><span>Foods</span></div>
        <div className="dashboard-stat"><strong>{recipeCount}</strong><span>Recipes</span></div>
      </div>
      {foods.length === 0 && <div className="dashboard-empty"><p>Nothing logged today yet.</p><Link to="/daily-tracker">Add your first food <ArrowRight size={14} aria-hidden="true" /></Link></div>}
      <div className="dashboard-card-actions">
        <Link to="/daily-tracker" style={{ textDecoration: 'none' }}><Button size="sm" variant="primary" leftIcon={<Plus size={15} aria-hidden="true" />}>Add Food</Button></Link>
        <Link to="/meals" style={{ textDecoration: 'none' }}><Button size="sm" variant="secondary" leftIcon={<UtensilsCrossed size={15} aria-hidden="true" />}>Log Meal</Button></Link>
      </div>
    </Card>
  );
};

interface DashboardAction {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const dashboardActions: DashboardAction[] = [
  { to: '/food-recognition', label: 'Scan Food', icon: <Search size={17} aria-hidden="true" /> },
  { to: '/consultation', label: 'Ask AI', icon: <MessageCircle size={17} aria-hidden="true" /> },
  { to: '/recipes', label: 'Create Recipe', icon: <UtensilsCrossed size={17} aria-hidden="true" /> },
  { to: '/meal-planner', label: 'Open Meal Planner', icon: <WandSparkles size={17} aria-hidden="true" /> },
  { to: '/recommendations', label: 'View Recommendations', icon: <Lightbulb size={17} aria-hidden="true" /> },
];

const QuickActions: React.FC = () => (
  <Card className="dashboard-section" aria-labelledby="dashboard-actions-title">
    <SectionHeading title="Quick actions" subtitle="Choose the next step that is useful for you." icon={<Plus size={19} color="var(--color-primary)" aria-hidden="true" />} />
    <div className="dashboard-action-grid" id="dashboard-actions-title">
      {dashboardActions.map((action) => <Link key={action.to} to={action.to} className="dashboard-action"><span className="dashboard-action-icon">{action.icon}</span><strong>{action.label}</strong></Link>)}
    </div>
  </Card>
);

const RecommendedNextStep: React.FC<{ recommendation: HealthDashboardRecommendation | null }> = ({ recommendation }) => {
  const food = recommendation?.foods[0];
  return (
    <Card className="dashboard-section" aria-labelledby="dashboard-next-title">
      <SectionHeading title="Recommended next step" subtitle="One suggestion based on today's available nutrition guidance." icon={<WandSparkles size={19} color="var(--color-primary)" aria-hidden="true" />} action={<Link className="dashboard-inline-link" to="/meal-planner">Open planner <ChevronRight size={15} aria-hidden="true" /></Link>} />
      {!food ? <div className="dashboard-empty" id="dashboard-next-title"><p>No recommendation is available right now.</p><Link to="/meal-planner">Explore Meal Planner <ArrowRight size={14} aria-hidden="true" /></Link></div> : <div className="dashboard-next-card" id="dashboard-next-title">
        <div className="dashboard-next-copy"><span className="dashboard-next-label">Recommended {recommendation?.mealType ? recommendation.mealType.toLowerCase() : 'meal'}</span><h3>{food.displayName}</h3>{food.variantLabel && <p>{food.variantLabel} · {food.servingName}</p>}<p>Selected for a {titleCase(recommendation?.focus ?? 'balanced').toLowerCase()} focus using today's intake and configured targets.</p><Link className="dashboard-inline-link" to="/meal-planner">View recommendation <ArrowRight size={14} aria-hidden="true" /></Link></div>
        <div className="dashboard-next-score"><strong>{food.score}/100</strong><span>{food.coverage < 100 ? 'Supporting score' : 'Compatibility'}</span></div>
      </div>}
    </Card>
  );
};

const LaboratorySummary: React.FC<{ summary: HealthDashboardLaboratorySummary }> = ({ summary }) => {
  const abnormalCount = summary.importantResults.length;
  const displayedResults = summary.importantResults.length > 0 ? summary.importantResults.slice(0, 3) : summary.results.slice(0, 3);
  return (
    <Card className="dashboard-section" aria-labelledby="dashboard-lab-title">
      <SectionHeading title="Latest laboratory" subtitle="A compact view of your most recent report." icon={<FlaskConical size={19} color="var(--color-primary)" aria-hidden="true" />} action={<Link className="dashboard-inline-link" to="/laboratory">View laboratory <ChevronRight size={15} aria-hidden="true" /></Link>} />
      {!summary.latestReport ? <div className="dashboard-empty" id="dashboard-lab-title"><p>No laboratory reports have been recorded yet.</p><Link to="/laboratory">Add a report <ArrowRight size={14} aria-hidden="true" /></Link></div> : <>
        <div className="dashboard-lab-summary" id="dashboard-lab-title"><div><strong>{summary.latestReport.reportDate}</strong><p>{titleCase(summary.latestReport.source)} report</p></div><span className={`dashboard-lab-count${abnormalCount === 0 ? ' is-normal' : ''}`}>{abnormalCount === 0 ? 'No abnormal values' : `${abnormalCount} abnormal`}</span></div>
        {displayedResults.length > 0 && <div className="dashboard-entry-list">{displayedResults.map((result) => <div key={result.id} className="dashboard-entry"><div className="dashboard-entry-copy"><strong>{result.testName}</strong><span>{result.status === 'normal' ? 'Within reference range' : result.status === 'unknown' ? 'Reference range unavailable' : result.status}</span></div><span style={{ color: statusColor(result.status), fontSize: '0.78rem', fontWeight: 800 }}>{formatAmount(result.value)} {result.unit}</span></div>)}</div>}
        {summary.trends.length > 0 && <div className="dashboard-trend-list"><strong style={{ fontSize: '0.78rem' }}>Trends</strong>{summary.trends.slice(0, 3).map((trend) => <div key={trend.testName} className="dashboard-trend"><strong>{trend.testName}</strong><span>{titleCase(trend.direction)}</span></div>)}</div>}
      </>}
    </Card>
  );
};

const CompatibilitySummary: React.FC<{ summary: { averageScore: number | null; evaluated: number; partiallyEvaluated: number; insufficientEvidence: number }; foods: readonly HealthDashboardDailyFood[] }> = ({ summary, foods }) => {
  const mostCompatible = [...foods].filter((food) => food.compatibilityScore != null).sort((left, right) => (right.compatibilityScore ?? -1) - (left.compatibilityScore ?? -1))[0];
  return (
    <Card className="dashboard-section" aria-labelledby="dashboard-compatibility-title">
      <SectionHeading title="Compatibility today" subtitle="Uses evaluation results already recorded today." icon={<Activity size={19} color="var(--color-primary)" aria-hidden="true" />} />
      <div className="dashboard-compatibility-stats" id="dashboard-compatibility-title">
        <div className="dashboard-stat"><strong>{summary.averageScore == null ? 'Not available' : `${summary.averageScore}/100`}</strong><span>Average score</span></div>
        <div className="dashboard-stat"><strong>{summary.evaluated}</strong><span>Evaluated</span></div>
        <div className="dashboard-stat"><strong>{summary.partiallyEvaluated}</strong><span>Partial checks</span></div>
        <div className="dashboard-stat"><strong>{summary.insufficientEvidence}</strong><span>Needs information</span></div>
      </div>
      <div className="dashboard-empty"><p>{mostCompatible ? `Most compatible item: ${mostCompatible.displayName}` : 'No evaluated food or recipe is available to highlight yet.'}</p><Link to="/daily-tracker">Review today's intake <ArrowRight size={14} aria-hidden="true" /></Link></div>
    </Card>
  );
};

const RecentActivity: React.FC<{ foods: readonly HealthDashboardDailyFood[]; recipes?: HealthDashboardRecipeSummary }> = ({ foods, recipes }) => {
  const recipeItems = recipes?.recent.slice(0, 3) ?? [];
  return (
    <Card className="dashboard-section" aria-labelledby="dashboard-activity-title">
      <SectionHeading title="Recent activity" subtitle="Pick up where you left off." icon={<BarChart3 size={19} color="var(--color-primary)" aria-hidden="true" />} />
      <div className="dashboard-activity-list" id="dashboard-activity-title">
        {foods.slice(0, 3).map((food) => <Link key={`food-${food.id}`} to="/daily-tracker" className="dashboard-activity" style={{ color: 'inherit', textDecoration: 'none' }}><span className="dashboard-activity-icon"><UtensilsCrossed size={15} aria-hidden="true" /></span><span className="dashboard-activity-copy"><strong>{food.displayName}</strong><span>{food.recipeId != null ? 'Saved recipe' : 'Catalog food'} · {food.quantity} · {food.servingName}</span></span><ChevronRight size={15} color="var(--text-muted)" aria-hidden="true" /></Link>)}
        {recipeItems.map((recipe) => <Link key={`recipe-${recipe.recipeId}`} to={`/recipes/${recipe.recipeId}`} className="dashboard-activity" style={{ color: 'inherit', textDecoration: 'none' }}><span className="dashboard-activity-icon"><UtensilsCrossed size={15} aria-hidden="true" /></span><span className="dashboard-activity-copy"><strong>{recipe.name}</strong><span>{recipe.isFavorite ? 'Favorite recipe' : 'Saved recipe'}</span></span><ChevronRight size={15} color="var(--text-muted)" aria-hidden="true" /></Link>)}
      </div>
      {foods.length === 0 && recipeItems.length === 0 && <div className="dashboard-empty"><p>No recent activity yet.</p><Link to="/consultation">Ask a nutrition question <ArrowRight size={14} aria-hidden="true" /></Link></div>}
      {recipes && <div className="dashboard-card-actions"><Link to="/recipes" style={{ textDecoration: 'none' }}><Button size="sm" variant="secondary">View all recipes</Button></Link></div>}
    </Card>
  );
};

export const DashboardPage: React.FC = () => {
  const dashboard = useHealthDashboard();

  if (dashboard.isLoading) return <LoadingSpinner label="Preparing your health dashboard..." />;
  if (dashboard.isError) return <EmptyState icon={<Activity size={32} />} title="Could not load your dashboard" description={dashboard.error.message} actionLabel="Try again" onAction={() => void dashboard.refetch()} />;
  if (dashboard.data == null) return <EmptyState icon={<Activity size={32} />} title="Your dashboard is not available" description="Try again in a moment." actionLabel="Refresh" onAction={() => void dashboard.refetch()} />;

  const data = dashboard.data;
  return (
    <div className="dashboard-shell">
      <DashboardWelcome greeting={data.greeting} />
      <NutritionContextLinks />
      <HealthNotices notices={data.healthNotices} />
      <NutritionSummary progress={data.nutritionProgress} />
      <div className="dashboard-main-grid">
        <div className="dashboard-stack">
          <MealsSummary foods={data.dailyFoods} />
          <QuickActions />
          <RecommendedNextStep recommendation={data.mealPlanner.recommendation} />
        </div>
        <div className="dashboard-stack">
          <LaboratorySummary summary={data.laboratorySummary} />
          <CompatibilitySummary summary={data.compatibilitySummary} foods={data.dailyFoods} />
          <RecentActivity foods={data.dailyFoods} recipes={data.recipeSummary} />
        </div>
      </div>
    </div>
  );
};
