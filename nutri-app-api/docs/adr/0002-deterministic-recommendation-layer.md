# ADR 0002: Deterministic, Policy-Driven Recommendation Layer

- Status: Proposed
- Date: 2026-08-17

## Recommendation Principles

These principles are the architectural constitution of the recommendation system.
Every current-meal recommendation, daily insight, historical pattern,
condition-specific policy, and AI-assisted capability must comply with them.

1. **No duplicate evaluation:** Recommendations never recalculate nutrients or
   scores. They consume outputs from the existing evaluation and policy pipeline.
2. **No diagnosis or prescription:** Recommendations never diagnose, prescribe,
   or replace professional medical judgment.
3. **Deterministic output:** The same versioned inputs must produce the same
   recommendation candidates, ordering, and selected output.
4. **Explainable decisions:** Every recommendation must provide clear evidence,
   reasoning, and applicable limitations.
5. **Approved policy evidence:** Recommendations are backed by approved,
   versioned policies and their declared evidence requirements, not ad hoc
   hardcoded heuristics.
6. **Versioned behavior:** Recommendation policies, evaluator versions, and
   relevant target policies are versioned so historical outputs remain
   reproducible as the system evolves.
7. **Complete provenance:** Recommendations preserve the policy, guideline,
   evaluation context, source snapshots, and other evidence that produced them.
8. **AI is never the decision-maker:** AI may assist with food recognition,
   extraction, normalization, conversation, or explanation, but it never
   independently generates authoritative recommendations. The deterministic
   backend remains the source of truth.
9. **Modular policies:** Recommendation policies are modular, composable, and
   independently testable. Each policy owns its applicability and evidence
   requirements.
10. **Immutable historical behavior:** Historical recommendations must remain
    reproducible from immutable evaluation snapshots and must never be silently
    rewritten by future policy changes.

## Context

NutriApp is evolving from a food logging application into a personalized nutrition
platform. It will eventually combine profile data, nutrition goals, medical
conditions, laboratory results, medications, meal history, adherence, preferences,
budget, and AI-assisted food interaction.

The existing nutrition foundation is deterministic and policy-driven. The
`FoodEvaluationEngine` calculates generic nutrient facts and contributions without
owning clinical policy. `NutritionPolicyService` orchestrates approved target and
policy decisions. `MealItemEvaluationSnapshot` stores immutable, versioned evaluation
results, targets, provenance, deferred policies, and evaluation time.

Recommendations must build on these facts without becoming a second nutrient
calculator, scoring engine, target calculator, or clinical policy evaluator. They
must remain explainable, reproducible, safe when evidence is incomplete, and
extensible as new policies are approved.

The recommendation layer also needs to support future food knowledge expansion. An
unknown food may be discovered and extracted with AI, but it must pass through
canonical food mapping, deterministic nutrient calculation, existing evaluation,
and user review before it becomes authoritative.

## Decision

NutriApp will implement recommendations as a deterministic layer above evaluation
and policy services:

```text
Authoritative source data
        -> policy and nutrient evaluation
        -> immutable evaluation snapshots
        -> recommendation context
        -> recommendation policies
        -> candidate recommendations
        -> deterministic resolver
        -> API or optional AI explanation
```

The backend remains the source of truth for nutrient values, targets, evaluations,
policy applicability, recommendation selection, and historical analytics.

The recommendation layer may interpret existing evaluation facts and policy outputs,
but must not duplicate calculations or independently decide whether a clinical
policy applies.

## Recommendation philosophy

Recommendations follow these principles:

- Prefer the most specific safe guidance supported by available evidence.
- Separate facts, policy decisions, and communication.
- Explain the evidence and limitations behind every recommendation.
- Treat incomplete, stale, deferred, or conflicting evidence explicitly.
- Preserve positive feedback and practical improvement guidance alongside cautions
  when they concern different facts.
- Never infer a diagnosis, clinical restriction, or nutrient target without an
  approved policy and its required evidence.
- Describe recorded behavior without moral judgment or unsupported claims about
  adherence.
- Make outputs deterministic for the same input data and policy versions.

Recommendation specificity is not a universal confidence score. Each recommendation
policy owns its own evidence requirements and decides whether it can produce a
specific result.

## Recommendation contexts

Recommendations are generated for explicit contexts. Contexts are projections of
authoritative facts and snapshots, not a universal clinical context that every
policy must consume.

### Current food

Uses the selected food or serving and its immutable item evaluation snapshot.
It explains the immediate nutrient contribution, positive attributes, cautions,
and practical improvements for that food.

### Current meal

Uses the food items in the meal and their eligible snapshots. It may describe
composition-level trade-offs, such as a positive protein contribution alongside
a sodium caution. It must not imply that one meal determines long-term health.

### Daily

Uses daily nutrient totals, applicable targets, meal/item evidence, deferred
policies, and data completeness. It describes progress and the highest-value
remaining opportunity for the day.

### Weekly

Uses daily summaries within a defined seven-day period. It describes recorded
patterns, target coverage, and practical coaching opportunities without treating
one unusual day as a stable behavior.

### Historical

Uses a defined time window, such as 28 or 90 days, with explicit completeness and
minimum-observation requirements. It may identify repeated patterns and monitoring
opportunities, but must qualify conclusions based on missing or incomplete data.

The reporting period, as-of time, source snapshot identifiers, and policy versions
must be retained in the recommendation evidence.

## Recommendation categories

The initial category set is:

- `positive`: reinforces a favorable contribution or choice;
- `caution`: identifies a potentially unfavorable contribution or threshold concern;
- `improvement`: proposes a practical change or next action;
- `educational`: explains a nutrition concept without requiring an action;
- `adherence`: describes recorded consistency, completion, or target-following
  patterns without judgment;
- `monitoring`: recommends observing a pattern over time;
- `follow-up`: explains that additional information or appropriate clinical review
  may be needed;
- `deferred-policy`: explains why a more specific policy recommendation was not
  produced.

Category is separate from disposition. A recommendation may be informational,
actionable, or require clinical follow-up. A deferred-policy recommendation is
not an error and must not be represented as a clinical conclusion.

## Recommendation lifecycle

The lifecycle is:

1. Build a context from authoritative current or historical data.
2. Select eligible immutable snapshots and record their versions.
3. Run approved recommendation policies against the context.
4. Produce independent recommendation candidates.
5. Validate candidate evidence, policy references, and scope.
6. Resolve duplicates and conflicts deterministically.
7. Return a bounded, ordered recommendation set with provenance.
8. Optionally record delivery, acknowledgement, or dismissal as a separate
   append-only event.

Recommendations are derived artifacts. Initially they will be generated on demand.
If persistence is later required for notifications, acknowledgement, or audit,
the persisted record must be append-only and retain the exact candidate payload,
source identifiers, policy versions, context period, and generation time.

Previously generated recommendation payloads must not be silently rewritten when
profile data, targets, food data, or policy versions change.

## Candidate generation

Each recommendation policy is a concrete, independently versioned implementation.
It declares the context it supports and the evidence it requires. It may produce
zero or more candidates, including an explicit deferred-policy candidate when its
required evidence is unavailable.

Candidate policies must consume existing facts, including:

- evaluation reasons and contributions;
- evaluation score and coverage where relevant;
- calculated targets and target provenance;
- deferred policy records;
- daily or historical aggregates;
- snapshot timestamps and versions;
- source completeness and recency information.

Candidate policies must not recalculate nutrient quantities, derive new targets,
replace `FoodEvaluationEngine` scoring, or determine clinical applicability outside
their approved policy boundary.

## Prioritization and conflict resolution

Candidate generation is independent from candidate selection. The resolver applies
stable rules in this order:

1. Safety-related and clinical follow-up recommendations.
2. High-severity policy-backed cautions.
3. Moderate cautions.
4. Actionable improvements.
5. Positive recommendations.
6. Monitoring and adherence recommendations.
7. Educational recommendations.
8. Deferred-policy explanations.

The ordering is precedence, not a replacement for evidence requirements. A positive
recommendation and a caution may both be retained when they concern different
nutrients or policy facts.

The resolver must:

- prefer a more specific recommendation over a general one;
- prefer policy-backed guidance over generic education for the same fact;
- deduplicate candidates by context, nutrient or subject, and policy family;
- retain the highest-severity candidate in a duplicate group;
- use evidence coverage and recency for otherwise equal candidates;
- use stable policy and recommendation identifiers as the final tie-breaker;
- preserve follow-up recommendations even when other messages are positive;
- enforce context-specific maximums to avoid recommendation overload.

Initial maximums are three recommendations for current food or meal, four for
daily and weekly contexts, and three for historical contexts. Safety and follow-up
recommendations may exceed normal category balancing when required.

The resolver must expose enough selection information for deterministic tests and
diagnostic logging, including candidates considered, suppressed candidates, and
the rule that determined the final selection. This diagnostic information need not
be part of the initial public API response.

### Conflict-key semantics

`conflictKey` is a stable semantic identifier for candidates that compete for the
same recommendation slot. It describes the subject, scope, and outcome rather
than the policy instance that produced the candidate.

Recommended format:

```text
<domain>:<subject>:<scope>:<outcome>
```

For example:

```text
nutrient:sodium:current-food:caution
nutrient:sodium:current-food:improvement
```

Policies should use the same key when their outputs are mutually exclusive and
different keys when recommendations may coexist. This allows independently
implemented policies to participate in shared conflict resolution without
requiring the resolver to know policy-specific identifiers.

## Policy, version, and provenance requirements

Every recommendation must identify:

- recommendation policy ID and version;
- applicable evaluator and nutrition policy versions;
- recommendation context and reporting period;
- source snapshot or aggregate identifiers;
- evidence fields and values used;
- policy source or guideline reference when applicable;
- generation timestamp;
- limitations, missing data, or deferred policy explanations where relevant.

Policy versions are immutable identifiers. A policy change produces a new version
and new derived recommendations; it does not mutate historical recommendation
payloads.

Condition-specific, laboratory-specific, and medication-specific recommendations
must identify their evidence requirements, source, recency rules, missing-data
behavior, clinical follow-up behavior, and applicable scope before implementation.

## Snapshot usage

Current contexts use the relevant immutable meal-item evaluation snapshots. Daily,
weekly, and historical contexts use aggregate facts plus the snapshots that support
those facts.

Historical recommendation generation uses snapshots eligible as of the reporting
period rather than silently applying newer evaluations to old intake. The selected
as-of rule must be explicit in the context and evidence.

If an eligible snapshot is missing, stale, incompatible, or has insufficient
coverage, the recommendation layer must reduce specificity or produce an explicit
deferred explanation. It must not silently recalculate or substitute an unversioned
result.

## AI boundaries

AI is an assistant, not a source of truth. It may:

- recognize food from images;
- extract text from OCR or recipes;
- suggest ingredient and serving mappings;
- normalize user language;
- explain deterministic recommendations conversationally;
- help users navigate available nutrition information.

AI must not author canonical nutrient values, calculate authoritative nutrients,
create targets, determine policy applicability, diagnose conditions, create medical
recommendations, select final recommendation priority, or override deterministic
backend results.

AI-extracted food data remains provisional until it is mapped to canonical foods,
validated, evaluated deterministically, and reviewed through the food approval
workflow.

## Food knowledge expansion and approval

When a food is not available, the future expansion workflow is:

```text
AI-assisted discovery and extraction
        -> ingredient and portion normalization
        -> canonical food mapping
        -> deterministic nutrient calculation
        -> existing food evaluation pipeline
        -> user review
        -> approved food record
```

An approved food must retain complete provenance, including source name and URL,
extraction details, canonical ingredient mappings, approval state, evaluator
version, nutrition policy version, and approval timestamp.

Source authority and review status are separate concepts. For example, USDA or
manufacturer data describes the source type, while user-approved or verified
describes the review state. A user-approved recipe must not be represented as
equivalent to USDA data merely because both are usable by the application.

Future community or expert review may promote a high-quality food into a shared
database, but promotion must retain the original provenance and add the reviewer,
review state, and promotion policy version.

## Future condition-specific extensibility

Future condition, laboratory, medication, and treatment-context policies extend the
recommendation layer through independently versioned policy implementations. They
must follow the evidence-graduated behavior defined by ADR 0001.

The shared recommendation layer is responsible for describing policy results,
provenance, limitations, and priority. It does not decide clinical applicability
for every condition and does not become a generic policy engine.

Food restrictions, allergies, contraindications, and medication interactions are
separate safety policy domains. They must not be modeled as ordinary optimization
preferences or inferred from a condition name alone.

## Recommended backend preparation before implementation

The following improvements are recommended before recommendation policies are
implemented, but are not part of the first recommendation vertical slice:

- Introduce typed, versioned snapshot payloads instead of relying on untyped JSON
  at recommendation boundaries.
- Add a snapshot query abstraction that supports latest-valid and as-of-period
  selection with explicit compatibility checks.
- Establish stable nutrient identifiers and policy identifiers so recommendation
  policies do not match display names or free-form strings.
- Preserve source-data completeness and recency metadata alongside daily and
  historical aggregates.
- Define a policy registry or manifest containing policy ID, version, source, and
  status without introducing a generic rule engine.
- Ensure evaluation and recommendation timestamps use an explicit timezone and
  reporting-period convention.
- Define provenance fields for future AI-assisted and user-approved food records.

These are enabling refactors. They should be implemented only where required by
the approved contracts and should preserve the existing evaluation behavior.

## Explicit non-goals

This ADR does not introduce:

- recommendation policy implementations;
- a generic rule engine;
- a universal clinical recommendation context;
- a diagnosis engine;
- AI-generated nutrition truth;
- automatic medical restrictions from profile conditions;
- mutable recommendation history;
- community food promotion behavior;
- a universal recommendation score;
- TypeScript recommendation contracts.

The next milestone after approval is to define the TypeScript contracts for
`Recommendation`, `RecommendationEvidence`, `RecommendationPolicy`,
`RecommendationContext`, `RecommendationCandidate`, and `RecommendationResolver`.
The milestone after that is a sodium-only vertical slice covering positive, caution,
improvement, and deferred-policy recommendations.

## Consequences

Recommendations will be reproducible, testable, and explainable because they are
derived from versioned deterministic facts. The architecture supports current meal
guidance while leaving room for daily coaching, historical trends, condition
policies, medication policies, and AI-assisted interaction.

The trade-off is that each policy must explicitly define its evidence and missing
data behavior, and historical reproducibility requires deliberate snapshot and
period selection. The product may initially expose fewer recommendations than a
generative system, but each exposed recommendation will have a defensible source
and policy boundary.
