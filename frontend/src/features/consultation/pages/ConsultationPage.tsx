import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Bot,
  CheckCircle2,
  ChevronDown,
  FlaskConical,
  Info,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CompatibilityScoreCard } from '@/components/ui/CompatibilityScoreCard';
import { useNutritionConsultation } from '../hooks/useNutritionConsultation';
import type {
  NutritionConsultationClarificationChoice,
  NutritionConsultationConversationTurn,
  NutritionConsultationEvaluation,
  NutritionConsultationPendingClarification,
  NutritionConsultationRequest,
  NutritionConsultationResponse,
} from '../types/consultation.types';
import { isConsultationSendShortcut } from '../consultationComposer';
import './consultation.css';

const starterQuestions = [
  'Can I eat Chicken Adobo?',
  'What can I eat for breakfast?',
  'Why is this recommended?',
  'Which of my lab results affected this?',
];

const nutrientLabels: Record<string, string> = {
  energy: 'Calories',
  calories: 'Calories',
  protein: 'Protein',
  carbohydrate: 'Carbohydrates',
  carbohydrates: 'Carbohydrates',
  fat: 'Fat',
  'total fat': 'Fat',
  fiber: 'Fiber',
  'dietary fiber': 'Fiber',
  sodium: 'Sodium',
  potassium: 'Potassium',
  phosphorus: 'Phosphorus',
  cholesterol: 'Cholesterol',
};

const nutrientLabel = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return nutrientLabels[normalized] ?? value.trim().replace(/\s+/g, ' ');
};

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

const firstAnswerParagraph = (answer: string) => {
  const paragraph = answer.split(/\n\s*\n/)[0]?.trim();
  return paragraph || answer;
};

const isPartialEvaluation = (evaluation: NutritionConsultationEvaluation) => (
  evaluation.evaluationStatus === 'insufficient-evidence'
  || evaluation.coverage < 100
  || evaluation.deferredPolicies.length > 0
);

const answerLabel = (evaluation: NutritionConsultationEvaluation | undefined) => {
  if (!evaluation || evaluation.evaluationStatus === 'insufficient-evidence') return 'MORE INFORMATION NEEDED';
  if (isPartialEvaluation(evaluation)) {
    if (evaluation.score >= 80) return 'YES, WITH CONTEXT';
    if (evaluation.score >= 50) return 'USE CAUTION';
    return 'NOT RECOMMENDED';
  }
  if (evaluation.score >= 80) return 'YES';
  if (evaluation.score >= 50) return 'USE CAUTION';
  return 'NOT RECOMMENDED';
};

const answerTone = (evaluation: NutritionConsultationEvaluation | undefined) => {
  if (!evaluation || evaluation.evaluationStatus === 'insufficient-evidence') return 'info';
  if (evaluation.score >= 80 && !isPartialEvaluation(evaluation)) return 'positive';
  if (evaluation.score >= 50) return 'caution';
  return 'negative';
};

const DirectionIcon: React.FC<{ direction: 'positive' | 'negative' | 'neutral' }> = ({ direction }) => {
  if (direction === 'positive') return <CheckCircle2 size={17} aria-hidden="true" />;
  if (direction === 'negative') return <AlertTriangle size={17} aria-hidden="true" />;
  return <Info size={17} aria-hidden="true" />;
};

const ConversationBubble: React.FC<{ turn: NutritionConsultationConversationTurn }> = ({ turn }) => {
  const isUser = turn.role === 'user';
  const visibleContent = isUser ? turn.content : firstAnswerParagraph(turn.content);
  return (
    <div className={`consultation-message ${isUser ? 'is-user' : 'is-assistant'}`}>
      <div className="consultation-message-inner">
        <span className="consultation-message-icon" aria-hidden="true">
          {isUser ? <UserRound size={17} /> : <Bot size={18} />}
        </span>
        <div className="consultation-message-bubble">
          <p>{visibleContent}</p>
        </div>
      </div>
    </div>
  );
};

const ConsultationPage: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<NutritionConsultationResponse | null>(null);
  const [conversation, setConversation] = useState<NutritionConsultationConversationTurn[]>([]);
  const consultation = useNutritionConsultation();
  const loadingRef = useRef<HTMLDivElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

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

  const submit = (
    request: NutritionConsultationRequest,
    userMessage: string,
    priorConversation: NutritionConsultationConversationTurn[],
  ) => {
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

  const submitClarification = (
    pending: NutritionConsultationPendingClarification,
    choice: NutritionConsultationClarificationChoice,
    userMessage: string,
  ) => {
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

  const evaluation = response?.recipeEvaluation?.evaluation ?? response?.foodEvaluation?.evaluation;
  const partial = evaluation ? isPartialEvaluation(evaluation) : false;
  const supportingRecommendations = response?.recommendations.recommendations.filter(({ category }) => category !== 'deferred-policy') ?? [];
  const selectedRecipe = response?.foodResolution?.candidates.find((candidate) => candidate.kind === 'approved-recipe');
  const directAnswer = evaluation ? firstAnswerParagraph(response?.answer ?? '') : response?.answer;
  const insightItems = evaluation?.nutritionInsights ?? [];
  const limitationItems = Array.from(new Set([
    ...(response?.limitations ?? []),
    ...(evaluation?.deferredPolicies.map((policy) => policy.explanation) ?? []),
    ...(partial && evaluation?.deferredPolicies.length === 0
      ? ['Some clinically relevant nutrition guidance could not be evaluated for this result.']
      : []),
  ].filter(Boolean)));

  return (
    <div className="consultation-page">
      <PageHeader title="Ask NutriApp" subtitle="A friendly nutrition coach grounded in your food, health, and nutrition information." />

      <div className="consultation-intro" aria-label="Consultation introduction">
        <Badge variant="info" size="sm" icon={<Sparkles size={13} />}>Nutrition coach</Badge>
        <span>Ask about a food, recipe, meal, lab result, or today&apos;s goals.</span>
      </div>

      {conversationHistory.length > 0 && (
        <section aria-label="Conversation" className="consultation-history">
          {conversationHistory.map((turn, index) => (
            <ConversationBubble key={`${turn.role}-${index}-${turn.content.slice(0, 20)}`} turn={turn} />
          ))}
        </section>
      )}

      {conversation.length === 0 && (
        <Card className="consultation-starter-card">
          <div className="consultation-starter-heading">
            <span className="consultation-starter-icon" aria-hidden="true"><Sparkles size={21} /></span>
            <div>
              <h2>What would you like help with?</h2>
              <p>Start with a question and I&apos;ll help you make sense of the nutrition guidance available for you.</p>
            </div>
          </div>
          <div className="consultation-starter-actions">
            {starterQuestions.map((starter) => (
              <button key={starter} type="button" className="consultation-starter-button" onClick={() => ask(starter)}>
                {starter}
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {consultation.isPending && (
        <div ref={loadingRef} className="consultation-loading" role="status" aria-live="polite" tabIndex={-1}>
          <LoadingSpinner label="Preparing your answer..." />
        </div>
      )}

      {consultation.isError && (
        <Card className="consultation-error" role="alert">
          I couldn&apos;t check that right now. {consultation.error.message}
        </Card>
      )}

      {response && !consultation.isPending && (
        <div
          ref={responseRef}
          tabIndex={-1}
          aria-live="polite"
          aria-label="Nutrition consultation answer"
          className="consultation-response"
        >
          <Card className={`consultation-answer-card tone-${answerTone(evaluation)}`}>
            <div className="consultation-section-kicker"><Brain size={16} aria-hidden="true" /> Answer</div>
            {evaluation && <div className="consultation-answer-label">{answerLabel(evaluation)}</div>}
            <p className="consultation-direct-answer">{directAnswer}</p>
            {!evaluation && <p className="consultation-source-note">Guidance based on your nutrition information and current goals.</p>}
          </Card>

          {response.recipeEvaluation && (
            <Card className="consultation-recipe-context" role="region" aria-label="Recipe details">
              <div className="consultation-section-heading-row">
                <div>
                  <div className="consultation-section-kicker">Recipe checked</div>
                  <h2>{selectedRecipe?.displayName ?? 'Your recipe'}</h2>
                </div>
                <Badge variant="neutral" size="sm">Your recipe</Badge>
              </div>
              <div className="consultation-recipe-meta">
                <span><strong>Recipe version</strong> {response.recipeEvaluation.recipeVersion}</span>
                <span><strong>Portion checked</strong> {response.recipeEvaluation.portionGrams} g</span>
                {selectedRecipe?.recipeYieldServings && <span><strong>Recipe yield</strong> {selectedRecipe.recipeYieldServings} servings</span>}
              </div>
            </Card>
          )}

          {response.foodEvaluation && (
            <Card className="consultation-food-context" aria-label="Food serving details" padding="md">
              <div className="consultation-section-kicker">Serving checked</div>
              <div className="consultation-food-context-row">
                <strong>{response.foodEvaluation.displayName}</strong>
                <span>{response.foodEvaluation.serving.quantity} × {response.foodEvaluation.serving.name} ({response.foodEvaluation.serving.grams} g)</span>
              </div>
            </Card>
          )}

          {evaluation && <CompatibilityScoreCard score={evaluation.score} partial={partial} title="Compatibility score" />}

          {evaluation && (
            <Card className="consultation-section-card">
              <div className="consultation-section-heading-row">
                <div>
                  <div className="consultation-section-kicker">The why</div>
                  <h2>Why this guidance</h2>
                </div>
                <CheckCircle2 size={19} className="consultation-heading-icon" aria-hidden="true" />
              </div>
              {evaluation.reasons.length > 0 ? (
                <div className="consultation-reason-list">
                  {evaluation.reasons.map((reason, index) => (
                    <div className={`consultation-reason reason-${reason.direction}`} key={`${reason.code}-${reason.nutrient}-${index}`}>
                      <DirectionIcon direction={reason.direction} />
                      <div>
                        <p>{reason.explanation}</p>
                        {(reason.measuredValue || reason.targetValue) && (
                          <span>{nutrientLabel(reason.nutrient)}: {reason.measuredValue}{reason.targetValue ? ` · Target ${reason.targetValue}` : ''}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="consultation-muted-copy">The available nutrition guidance did not include a specific explanation for this result.</p>
              )}
            </Card>
          )}

          {evaluation && evaluation.contributions.length > 0 && (
            <section className="consultation-section" aria-labelledby="consultation-highlights-heading">
              <div className="consultation-section-title-row">
                <div>
                  <div className="consultation-section-kicker">At a glance</div>
                  <h2 id="consultation-highlights-heading">Nutrition highlights</h2>
                </div>
              </div>
              <div className="consultation-highlight-grid">
                {evaluation.contributions.map((contribution) => (
                  <Card className="consultation-highlight-card" padding="md" key={contribution.nutrient}>
                    <span>{nutrientLabel(contribution.nutrient)}</span>
                    <strong>{contribution.amount}{contribution.unit ? ` ${contribution.unit}` : ''}</strong>
                    {contribution.explanation && <p>{contribution.explanation}</p>}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {insightItems.length > 0 && (
            <section className="consultation-section" aria-labelledby="consultation-insights-heading">
              <div className="consultation-section-title-row">
                <div>
                  <div className="consultation-section-kicker">Helpful context</div>
                  <h2 id="consultation-insights-heading">Things to watch</h2>
                </div>
                <Info size={19} className="consultation-heading-icon" aria-hidden="true" />
              </div>
              <div className="consultation-insight-list">
                {insightItems.map((insight) => (
                  <Card className="consultation-insight-card" padding="md" key={`${insight.category}-${insight.title}`}>
                    <div className="consultation-insight-heading">
                      <strong>{insight.title}</strong>
                      {insight.evidence && <Badge variant="neutral" size="sm">{insight.evidence.amount} {insight.evidence.unit}</Badge>}
                    </div>
                    <p>{insight.message}</p>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {limitationItems.length > 0 && (
            <Card className="consultation-limitations" role="region" aria-label="Evaluation limitations">
              <div className="consultation-section-heading-row">
                <div>
                  <div className="consultation-section-kicker">A little context</div>
                  <h2>Limitations</h2>
                </div>
                <Info size={19} className="consultation-heading-icon" aria-hidden="true" />
              </div>
              <ul>
                {limitationItems.map((limitation) => <li key={limitation}>{limitation}</li>)}
              </ul>
            </Card>
          )}

          {response.aiExplanation && (
            <Card className="consultation-ai-card" role="region" aria-label="AI-generated explanation">
              <div className="consultation-ai-heading">
                <div>
                  <div className="consultation-section-kicker"><Sparkles size={14} aria-hidden="true" /> AI-generated explanation</div>
                  <h2>A little more context</h2>
                </div>
                <Bot size={21} aria-hidden="true" />
              </div>
              <p>{response.aiExplanation}</p>
              <span className="consultation-ai-disclaimer">The deterministic evaluation above remains the authoritative guidance.</span>
            </Card>
          )}

          {response.pendingClarification && (
            <Card aria-label="Food clarification choices" className="consultation-clarification-card">
              <div className="consultation-section-kicker">One quick question</div>
              <h2>Which food or recipe did you mean?</h2>
              <p>Select an option so I can answer your original question.</p>
              <div className="consultation-clarification-list">
                {response.pendingClarification.choices.map((choice, index) => (
                  <Button
                    key={choice.stableId ?? `${choice.kind}-${index}-${choice.displayName}`}
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!choice.stableId || consultation.isPending}
                    onClick={() => submitClarification(response.pendingClarification!, choice, clarificationLabel(choice))}
                    className="consultation-clarification-button"
                    aria-label={`Choose ${clarificationLabel(choice)}`}
                  >
                    <span>
                      <strong>{clarificationLabel(choice)}</strong>
                      {clarificationDetails(choice).map((detail) => <small key={detail}>{detail}</small>)}
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {supportingRecommendations.length > 0 && (
            <Card className="consultation-supporting-guidance">
              <div className="consultation-section-heading-row">
                <div>
                  <div className="consultation-section-kicker">If useful</div>
                  <h2>Additional guidance</h2>
                </div>
                <ChevronDown size={18} aria-hidden="true" />
              </div>
              <div className="consultation-recommendation-list">
                {supportingRecommendations.map((recommendation) => (
                  <details key={recommendation.id}>
                    <summary><span>{recommendation.title}</span><ChevronDown size={15} aria-hidden="true" /></summary>
                    <p>{recommendation.message}</p>
                    {recommendation.evidence.map((evidence) => <small key={evidence.id}>{evidence.explanation}</small>)}
                  </details>
                ))}
              </div>
            </Card>
          )}

          {response.laboratoryEvidence.length > 0 && (
            <Card className="consultation-lab-card">
              <div className="consultation-section-heading-row">
                <div>
                  <div className="consultation-section-kicker"><FlaskConical size={14} aria-hidden="true" /> Your information</div>
                  <h2>Lab results used</h2>
                </div>
              </div>
              <div className="consultation-lab-list">
                {response.laboratoryEvidence.map((lab) => (
                  <details key={lab.id}>
                    <summary><span>{lab.testCode.toUpperCase()}: {lab.value} {lab.unit}</span><span className={lab.status === 'stale' ? 'is-stale' : ''}>{lab.status === 'current' ? 'Used in current guidance' : lab.status === 'stale' ? 'Needs a newer result' : 'Recorded'}</span></summary>
                    <p>Collected {lab.collectedAt.slice(0, 10)} · Source: {lab.source}</p>
                    {lab.usedByPolicies.map((policy) => <small key={`${lab.id}-${policy.policyId}`}>{policy.explanation}</small>)}
                  </details>
                ))}
              </div>
            </Card>
          )}

          {response.laboratoryInsights && response.laboratoryInsights.length > 0 && (
            <Card className="consultation-lab-card">
              <div className="consultation-section-kicker">Laboratory context</div>
              <div className="consultation-insight-list">
                {response.laboratoryInsights.map((insight) => (
                  <div key={`${insight.category}-${insight.title}`} className="consultation-inline-insight">
                    <strong>{insight.title}</strong>
                    <p>{insight.message}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      <Card className="consultation-composer">
        <form onSubmit={(event) => { event.preventDefault(); ask(); }}>
          <label className="sr-only" htmlFor="consultation-question">Your nutrition question</label>
          <textarea
            id="consultation-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Ask a nutrition question..."
            aria-label="Your nutrition question"
            maxLength={500}
            rows={2}
          />
          <div className="consultation-composer-footer">
            <span>Enter to send · Shift + Enter for a new line</span>
            <Button type="submit" variant="primary" disabled={!question.trim() || consultation.isPending} leftIcon={<Send size={16} />}>
              Ask
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export { ConsultationPage };
