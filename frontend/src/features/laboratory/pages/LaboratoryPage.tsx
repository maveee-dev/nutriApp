import React, { useState } from 'react';
import { format } from 'date-fns';
import { Activity, FlaskConical, History, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Select } from '@/components/ui/Select';
import { useCreateLaboratoryReportMutation, useLaboratoryLatest, useLaboratoryReports, useLaboratoryTrends } from '../hooks/useLaboratory';
import { LABORATORY_TESTS, type LaboratoryResultStatus } from '../types/laboratory.types';

interface DraftResult {
  testCode: string;
  value: string;
  unit: string;
  referenceLow: string;
  referenceHigh: string;
}

const newResult = (): DraftResult => ({ testCode: LABORATORY_TESTS[0].code, value: '', unit: LABORATORY_TESTS[0].unit, referenceLow: '', referenceHigh: '' });
const statusVariant = (status: LaboratoryResultStatus): 'success' | 'warning' | 'clinical' => status === 'normal' ? 'success' : status === 'unknown' ? 'clinical' : 'warning';

const trendIcon = (direction: string) => {
  if (direction === 'improving') return <TrendingDown size={16} color="var(--color-success)" />;
  if (direction === 'worsening') return <TrendingUp size={16} color="var(--color-danger)" />;
  return <Activity size={16} color="var(--color-primary)" />;
};

export const LaboratoryPage: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [reportDate, setReportDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [source, setSource] = useState('manual');
  const [draftResults, setDraftResults] = useState<DraftResult[]>([newResult()]);
  const [formError, setFormError] = useState<string | null>(null);
  const reports = useLaboratoryReports();
  const latest = useLaboratoryLatest();
  const trends = useLaboratoryTrends();
  const createReport = useCreateLaboratoryReportMutation();

  const updateDraft = (index: number, patch: Partial<DraftResult>) => {
    setDraftResults((current) => current.map((result, resultIndex) => resultIndex === index ? { ...result, ...patch } : result));
  };

  const chooseTest = (index: number, code: string) => {
    const test = LABORATORY_TESTS.find((candidate) => candidate.code === code);
    updateDraft(index, { testCode: code, unit: test?.unit ?? '' });
  };

  const resetForm = () => {
    setReportDate(format(new Date(), 'yyyy-MM-dd'));
    setSource('manual');
    setDraftResults([newResult()]);
    setFormError(null);
    setIsAdding(false);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const usable = draftResults.filter((result) => result.value.trim() !== '' && result.unit.trim() !== '');
    if (!reportDate || usable.length === 0) {
      setFormError('Add a date and at least one result value before saving.');
      return;
    }
    setFormError(null);
    createReport.mutate({
      reportDate,
      source: source.trim() || 'manual',
      results: usable.map((result) => ({
        testCode: result.testCode,
        value: result.value,
        unit: result.unit,
        ...(result.referenceLow ? { referenceLow: result.referenceLow } : {}),
        ...(result.referenceHigh ? { referenceHigh: result.referenceHigh } : {}),
      })),
    }, { onSuccess: resetForm });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader title="Laboratory Analysis" subtitle="Review your recorded laboratory results, history, and deterministic nutrition context." action={<Button variant="primary" onClick={() => setIsAdding((current) => !current)} leftIcon={<Plus size={18} />}>{isAdding ? 'Close' : 'Add report'}</Button>} />

      {isAdding && <Card>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div><h2 style={{ fontSize: '1.05rem', fontWeight: 750 }}>Record a laboratory report</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>Reports are saved as historical records. Review each value before saving.</p></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--space-md)' }}><Input label="Report date" type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} required /><Input label="Source" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Manual entry" /></div>
          {draftResults.map((result, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 1.2fr) repeat(4, minmax(100px, 1fr)) auto', gap: 8, alignItems: 'end', padding: 10, background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}>
            <Select label={index === 0 ? 'Test' : undefined} value={result.testCode} onChange={(event) => chooseTest(index, event.target.value)} options={LABORATORY_TESTS.map((test) => ({ value: test.code, label: test.label }))} />
            <Input label={index === 0 ? 'Value' : undefined} type="number" step="any" value={result.value} onChange={(event) => updateDraft(index, { value: event.target.value })} />
            <Input label={index === 0 ? 'Unit' : undefined} value={result.unit} onChange={(event) => updateDraft(index, { unit: event.target.value })} />
            <Input label={index === 0 ? 'Reference low' : undefined} type="number" step="any" value={result.referenceLow} onChange={(event) => updateDraft(index, { referenceLow: event.target.value })} />
            <Input label={index === 0 ? 'Reference high' : undefined} type="number" step="any" value={result.referenceHigh} onChange={(event) => updateDraft(index, { referenceHigh: event.target.value })} />
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove test ${index + 1}`} onClick={() => setDraftResults((current) => current.filter((_item, resultIndex) => resultIndex !== index))} disabled={draftResults.length === 1}><Trash2 size={16} /></Button>
          </div>)}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Button type="button" variant="secondary" size="sm" onClick={() => setDraftResults((current) => [...current, newResult()])} leftIcon={<Plus size={15} />}>Add another result</Button><Button type="submit" isLoading={createReport.isPending}>Save report</Button></div>
          {formError && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem' }}>{formError}</p>}
        </form>
      </Card>}

      {latest.isLoading ? <LoadingSpinner label="Loading latest laboratory results..." /> : latest.isError ? <EmptyState icon={<FlaskConical size={32} />} title="Could not load laboratory analysis" description={latest.error.message} actionLabel="Try again" onAction={() => void latest.refetch()} /> : <>
        <Card><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}><FlaskConical size={18} color="var(--color-clinical)" /><h2 style={{ fontSize: '1.05rem', fontWeight: 750 }}>Recent results</h2></div>{latest.data?.results.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>{latest.data.results.map((result) => <div key={result.id} style={{ padding: 12, background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><strong>{result.testName}</strong><Badge variant={statusVariant(result.status)} size="sm">{result.status}</Badge></div><p style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: 8 }}>{result.value} <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{result.unit}</small></p><p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 5 }}>{result.message}</p></div>)}</div> : <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No laboratory results recorded yet.</p>}</Card>
        {latest.data && latest.data.nutritionInsights.length > 0 && <Card><h2 style={{ fontSize: '1.05rem', fontWeight: 750 }}>Nutrition insights</h2><div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'var(--space-md)' }}>{latest.data.nutritionInsights.map((insight) => <div key={`${insight.category}-${insight.title}`} style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--color-clinical-light)' }}><strong style={{ display: 'block' }}>{insight.title}</strong><p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.45, marginTop: 4 }}>{insight.message}</p></div>)}</div></Card>}
      </>}

      <Card><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}><Activity size={18} color="var(--color-primary)" /><h2 style={{ fontSize: '1.05rem', fontWeight: 750 }}>Trends</h2></div>{trends.isLoading ? <LoadingSpinner label="Calculating trends..." size={18} /> : trends.data?.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{trends.data.map((trend) => <div key={trend.testCode} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 10, background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><div><strong>{trend.testName}</strong><p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 3 }}>{trend.points.length} recorded result{trend.points.length === 1 ? '' : 's'} · Latest {trend.latest.value} {trend.latest.unit}</p></div><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{trendIcon(trend.direction)}{trend.direction.replace('-', ' ')}</span></div>)}</div> : <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Add more reports to see trends over time.</p>}</Card>

      <Card><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)' }}><History size={18} color="var(--color-primary)" /><h2 style={{ fontSize: '1.05rem', fontWeight: 750 }}>Laboratory history</h2></div>{reports.isLoading ? <LoadingSpinner label="Loading report history..." size={18} /> : reports.isError ? <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{reports.error.message}</p> : reports.data?.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{reports.data.map((report) => <details key={report.id} style={{ padding: 10, background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}><summary style={{ cursor: 'pointer', fontWeight: 700 }}>{report.reportDate} · {report.results.length} result{report.results.length === 1 ? '' : 's'} · {report.source}</summary><div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>{report.results.map((result) => <div key={result.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.8rem' }}><span>{result.testName}</span><span>{result.value} {result.unit} · {result.status}</span></div>)}</div></details>)}</div> : <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No report history yet. Add your first report above.</p>}</Card>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.45 }}>Laboratory results are clinical evidence. They do not create nutrition targets or change food compatibility scores by themselves. Discuss concerning results with your healthcare provider.</p>
    </div>
  );
};
