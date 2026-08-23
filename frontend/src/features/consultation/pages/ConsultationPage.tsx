import React, { useState } from 'react';
import { format } from 'date-fns';
import { Brain, FlaskConical, Send, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useNutritionConsultation } from '../hooks/useNutritionConsultation';
import type { NutritionConsultationConversationTurn, NutritionConsultationResponse } from '../types/consultation.types';

const starterQuestions = ['What should I improve today?', 'Why is this recommended?', 'Which of my lab results affected this?', 'What should I eat today?'];

export const ConsultationPage: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<NutritionConsultationResponse | null>(null);
  const [conversation, setConversation] = useState<NutritionConsultationConversationTurn[]>([]);
  const consultation = useNutritionConsultation();
  const ask = (value = question) => {
    const trimmed = value.trim();
    if (!trimmed || consultation.isPending) return;
    setQuestion(trimmed);
    consultation.mutate({ question: trimmed, date: format(new Date(), 'yyyy-MM-dd'), conversation }, {
      onSuccess: (nextResponse) => {
        setResponse(nextResponse);
        setConversation((turns) => [...turns, { role: 'user' as const, content: trimmed }, { role: 'assistant' as const, content: nextResponse.answer }].slice(-8));
      },
    });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader title="Ask NutriApp" subtitle="Friendly guidance grounded in your goals, meals, and approved nutrition evidence." />
      <Card style={{ border: '1.5px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)' }}>
          <Sparkles size={21} color="var(--color-primary)" />
          <div><h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>What would you like help with?</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ask about a food, today’s goals, or the evidence behind your guidance.</p></div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-md)' }}>
          {starterQuestions.map((starter) => <button key={starter} type="button" onClick={() => ask(starter)} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-secondary)', color: 'var(--text-secondary)', padding: '7px 11px', cursor: 'pointer', fontSize: '0.78rem' }}>{starter}</button>)}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); ask(); }} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. Can I eat this?" maxLength={500} rows={3} style={{ flex: 1, resize: 'vertical', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '10px 12px', font: 'inherit', color: 'var(--text-primary)', background: 'var(--bg-surface)' }} />
          <Button type="submit" variant="primary" disabled={!question.trim() || consultation.isPending} leftIcon={<Send size={16} />}>Ask</Button>
        </form>
      </Card>
      {consultation.isPending && <LoadingSpinner label="Checking your current nutrition guidance..." />}
      {consultation.isError && <Card style={{ color: 'var(--color-danger)' }}>I couldn’t check that right now. {consultation.error.message}</Card>}
      {response && !consultation.isPending && <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <Card style={{ border: '1.5px solid var(--color-primary)', backgroundColor: 'var(--color-primary-subtle)' }}><div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><Brain size={20} color="var(--color-primary)" /><div><p style={{ fontSize: '1rem', lineHeight: 1.6 }}>{response.answer}</p><p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{response.aiAssisted ? `AI explanation grounded in ${response.aiProvider ?? 'deterministic evidence'}.` : 'Evidence-based guidance from your deterministic nutrition analysis.'}</p></div></div></Card>
        {response.recommendations.recommendations.length > 0 && <Card><h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 'var(--space-sm)' }}>Your supporting guidance</h3>{response.recommendations.recommendations.map((recommendation) => <div key={recommendation.id} style={{ padding: '10px 12px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}><strong>{recommendation.title}</strong><p style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{recommendation.message}</p><details style={{ marginTop: 6 }}><summary style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 700 }}>Why?</summary><p style={{ marginTop: 5, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Policy: {recommendation.policy.policyId} v{recommendation.policy.version}</p>{recommendation.evidence.map((evidence) => <p key={evidence.id} style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{evidence.explanation}</p>)}</details></div>)}</Card>}
        {response.laboratoryEvidence.length > 0 && <Card><h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 'var(--space-sm)' }}><FlaskConical size={16} style={{ verticalAlign: 'text-bottom' }} /> Your lab evidence</h3>{response.laboratoryEvidence.map((lab) => <details key={lab.id} style={{ borderTop: '1px solid var(--border-light)', padding: '9px 0' }}><summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{lab.testCode.toUpperCase()}: {lab.value} {lab.unit}</span><span style={{ color: lab.status === 'stale' ? 'var(--color-danger)' : 'var(--text-muted)', fontSize: '0.78rem' }}>{lab.status === 'current' ? 'Used in current guidance' : lab.status === 'stale' ? 'Needs a newer result' : 'Recorded'}</span></summary><p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 6 }}>Collected {lab.collectedAt.slice(0, 10)} · Source: {lab.source}</p>{lab.usedByPolicies.map((policy) => <p key={`${lab.id}-${policy.policyId}`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 3 }}>{policy.explanation} ({policy.policyId} v{policy.version})</p>)}</details>)}</Card>}
        <details><summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }}>About this guidance</summary><ul style={{ marginTop: 8, paddingLeft: 20, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{response.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></details>
      </div>}
    </div>
  );
};
