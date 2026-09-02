import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Brain, Bot, FlaskConical, Send, Sparkles, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useNutritionConsultation } from '../hooks/useNutritionConsultation';
import type { NutritionConsultationClarificationChoice, NutritionConsultationConversationTurn, NutritionConsultationPendingClarification, NutritionConsultationResponse, NutritionConsultationRequest } from '../types/consultation.types';
import { isConsultationSendShortcut } from '../consultationComposer';

const starterQuestions = ['What should I improve today?', 'Why is this recommended?', 'Which of my lab results affected this?', 'What should I eat today?'];

const clarificationLabel = (choice: NutritionConsultationClarificationChoice) => (
  `${choice.displayName}${choice.variantLabel ? ` — ${choice.variantLabel}` : ''}`
);

const clarificationDetails = (choice: NutritionConsultationClarificationChoice) => {
  if (choice.kind !== 'approved-recipe') return [];
  return [
    choice.recipeYieldServings ? `Makes ${choice.recipeYieldServings} servings` : null,
    choice.recipeIngredientNames && choice.recipeIngredientNames.length > 0
      ? choice.recipeIngredientNames.join(', ')
      : null,
  ].filter((detail): detail is string => Boolean(detail));
};

const ConversationBubble: React.FC<{ turn: NutritionConsultationConversationTurn }> = ({ turn }) => {
  const isUser = turn.role === 'user';
  return (
    <div className="consultation-message" style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '88%', flexDirection: isUser ? 'row-reverse' : 'row' }}>
        {isUser ? <UserRound size={17} color="var(--text-muted)" aria-hidden="true" /> : <Bot size={18} color="var(--color-primary)" aria-hidden="true" />}
        <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: isUser ? 'var(--bg-surface-secondary)' : 'var(--color-primary-subtle)', color: 'var(--text-primary)' }}>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{turn.content}</p>
        </div>
      </div>
    </div>
  );
};

export const ConsultationPage: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<NutritionConsultationResponse | null>(null);
  const [conversation, setConversation] = useState<NutritionConsultationConversationTurn[]>([]);
  const consultation = useNutritionConsultation();
  const loadingRef = useRef<HTMLDivElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const supportingRecommendations = response?.recommendations.recommendations.filter(({ category }) => category !== 'deferred-policy') ?? [];
  const conversationHistory = conversation[conversation.length - 1]?.role === 'assistant'
    ? conversation.slice(0, -1)
    : conversation;

  useEffect(() => {
    if (!consultation.isPending) return;
    loadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [consultation.isPending]);

  useEffect(() => {
    if (response == null || consultation.isPending) return;
    responseRef.current?.focus({ preventScroll: true });
    responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [response, consultation.isPending]);

  const submit = (request: NutritionConsultationRequest, userMessage: string, priorConversation: NutritionConsultationConversationTurn[]) => {
    const userTurn: NutritionConsultationConversationTurn = { role: 'user', content: userMessage };
    setQuestion('');
    setConversation([...priorConversation, userTurn].slice(-8));
    consultation.mutate(request, {
      onSuccess: (nextResponse) => {
        setResponse(nextResponse);
        setConversation((turns) => [...turns, { role: 'assistant' as const, content: nextResponse.answer }].slice(-8));
      },
      onError: () => setConversation(priorConversation),
    });
  };

  const submitClarification = (pending: NutritionConsultationPendingClarification, choice: NutritionConsultationClarificationChoice, userMessage: string) => {
    if (!choice.stableId || consultation.isPending) return;
    const priorConversation = conversation;
    submit({
      question: pending.originalQuestion,
      date: format(new Date(), 'yyyy-MM-dd'),
      conversation: priorConversation,
      clarificationSelection: {
        type: pending.type,
        originalQuestion: pending.originalQuestion,
        selectedStableId: choice.stableId,
      },
    }, userMessage, priorConversation);
  };

  const ask = (value = question) => {
    const trimmed = value.trim();
    if (!trimmed || consultation.isPending) return;
    const priorConversation = conversation;
    const pending = response?.pendingClarification;
    const numericSelection = /^(\d+)$/.exec(trimmed);
    if (pending && numericSelection) {
      const choice = pending.choices[Number(numericSelection[1]) - 1];
      if (choice != null) {
        submitClarification(pending, choice, clarificationLabel(choice));
        return;
      }
      // Preserve numeric-reply compatibility for invalid choices too. The
      // backend revalidates this value and returns the current clarification.
      submit({
        question: pending.originalQuestion,
        date: format(new Date(), 'yyyy-MM-dd'),
        conversation: priorConversation,
        clarificationSelection: {
          type: pending.type,
          originalQuestion: pending.originalQuestion,
          selectedStableId: trimmed,
        },
      }, trimmed, priorConversation);
      return;
    }

    submit({ question: trimmed, date: format(new Date(), 'yyyy-MM-dd'), conversation: priorConversation }, trimmed, priorConversation);
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isConsultationSendShortcut({
      key: event.key,
      shiftKey: event.shiftKey,
      isComposing: event.nativeEvent.isComposing,
      keyCode: event.keyCode,
    })) return;

    event.preventDefault();
    ask();
  };

  return (
    <div className="consultation-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <PageHeader title="Ask NutriApp" subtitle="Friendly nutrition guidance based on your goals, meals, and health information." />

      {conversationHistory.length > 0 && (
        <section aria-label="Conversation" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {conversationHistory.map((turn, index) => <ConversationBubble key={`${turn.role}-${index}-${turn.content.slice(0, 20)}`} turn={turn} />)}
        </section>
      )}

      {conversation.length === 0 && (
        <Card style={{ border: '1.5px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)' }}>
            <Sparkles size={21} color="var(--color-primary)" />
            <div><h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>What would you like help with?</h2><p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ask about a food, today&apos;s goals, or the information behind your guidance.</p></div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {starterQuestions.map((starter) => <button key={starter} type="button" onClick={() => ask(starter)} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-secondary)', color: 'var(--text-secondary)', padding: '7px 11px', cursor: 'pointer', fontSize: '0.78rem' }}>{starter}</button>)}
          </div>
        </Card>
      )}

      {consultation.isPending && <div ref={loadingRef} role="status" aria-live="polite" tabIndex={-1}><LoadingSpinner label="Preparing your answer..." /></div>}
      {consultation.isError && <Card style={{ color: 'var(--color-danger)' }}>I couldn&apos;t check that right now. {consultation.error.message}</Card>}

      {response && !consultation.isPending && (
        <div ref={responseRef} tabIndex={-1} aria-live="polite" className="consultation-response" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', outline: 'none' }}>
          <Card style={{ border: '1.5px solid var(--color-primary)', backgroundColor: 'var(--color-primary-subtle)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Brain size={20} color="var(--color-primary)" aria-hidden="true" />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '1rem', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{response.answer}</p>
                {response.aiExplanation && <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}><strong style={{ fontSize: '0.85rem' }}>A little more context</strong><p style={{ marginTop: 5, fontSize: '0.92rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{response.aiExplanation}</p></div>}
                <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{response.aiAssisted ? 'AI explanation based on your nutrition information.' : 'Guidance based on your nutrition information and current goals.'}</p>
              </div>
            </div>
          </Card>

          {response.pendingClarification && <Card aria-label="Food clarification choices" style={{ border: '1.5px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 'var(--space-sm)' }}>Choose the food you mean</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-sm)' }}>Select an option so I can evaluate the original question.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {response.pendingClarification.choices.map((choice, index) => <Button
                key={choice.stableId ?? `${choice.kind}-${index}-${choice.displayName}`}
                type="button"
                variant="secondary"
                size="sm"
                disabled={!choice.stableId || consultation.isPending}
                onClick={() => submitClarification(response.pendingClarification!, choice, clarificationLabel(choice))}
                style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', minHeight: 48, whiteSpace: 'normal' }}
                aria-label={`Choose ${clarificationLabel(choice)}`}
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span>{clarificationLabel(choice)}</span>
                  {clarificationDetails(choice).map((detail) => <span key={detail} style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{detail}</span>)}
                </span>
              </Button>)}
            </div>
          </Card>}

          {supportingRecommendations.length > 0 && <Card><h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 'var(--space-sm)' }}>Your supporting guidance</h3>{supportingRecommendations.map((recommendation) => <div key={recommendation.id} style={{ padding: '10px 12px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}><strong>{recommendation.title}</strong><p style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{recommendation.message}</p><details style={{ marginTop: 6 }}><summary style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 700 }}>Why?</summary>{recommendation.evidence.map((evidence) => <p key={evidence.id} style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{evidence.explanation}</p>)}</details></div>)}</Card>}
          {response.laboratoryEvidence.length > 0 && <Card><h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 'var(--space-sm)' }}><FlaskConical size={16} style={{ verticalAlign: 'text-bottom' }} /> Your lab results</h3>{response.laboratoryEvidence.map((lab) => <details key={lab.id} style={{ borderTop: '1px solid var(--border-light)', padding: '9px 0' }}><summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{lab.testCode.toUpperCase()}: {lab.value} {lab.unit}</span><span style={{ color: lab.status === 'stale' ? 'var(--color-danger)' : 'var(--text-muted)', fontSize: '0.78rem' }}>{lab.status === 'current' ? 'Used in current guidance' : lab.status === 'stale' ? 'Needs a newer result' : 'Recorded'}</span></summary><p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 6 }}>Collected {lab.collectedAt.slice(0, 10)} · Source: {lab.source}</p>{lab.usedByPolicies.map((policy) => <p key={`${lab.id}-${policy.policyId}`} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 3 }}>{policy.explanation}</p>)}</details>)}</Card>}
          {response.laboratoryInsights && response.laboratoryInsights.length > 0 && <Card><h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 'var(--space-sm)' }}>Laboratory context</h3>{response.laboratoryInsights.map((insight) => <div key={`${insight.category}-${insight.title}`} style={{ padding: '10px 12px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}><strong>{insight.title}</strong><p style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{insight.message}</p></div>)}</Card>}
          <details><summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }}>About this guidance</summary><ul style={{ marginTop: 8, paddingLeft: 20, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{response.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></details>
        </div>
      )}

      <Card className="consultation-composer" style={{ zIndex: 55, boxShadow: '0 -6px 18px rgba(0, 0, 0, 0.08)', backgroundColor: 'var(--bg-surface)' }}>
        <form onSubmit={(event) => { event.preventDefault(); ask(); }} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Ask a nutrition question..." aria-label="Your nutrition question" maxLength={500} rows={2} style={{ flex: 1, minWidth: 0, resize: 'vertical', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '10px 12px', font: 'inherit', color: 'var(--text-primary)', background: 'var(--bg-surface)' }} />
          <Button type="submit" variant="primary" disabled={!question.trim() || consultation.isPending} leftIcon={<Send size={16} />}>Ask</Button>
        </form>
      </Card>

      <style>{`
        .consultation-message,
        .consultation-response {
          animation: consultation-message-in 220ms ease-out;
        }
        .consultation-composer {
          position: sticky;
          bottom: var(--space-md);
        }
        @keyframes consultation-message-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1023px) {
          .consultation-page {
            padding-bottom: calc(150px + env(safe-area-inset-bottom));
          }
          .consultation-composer {
            position: fixed;
            left: 0;
            right: 0;
            bottom: calc(68px + env(safe-area-inset-bottom));
            border-radius: 0;
            border-left: 0;
            border-right: 0;
            padding: var(--space-sm) var(--space-md) !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .consultation-message,
          .consultation-response {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};
