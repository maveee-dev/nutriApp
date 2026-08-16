# ADR 0001: Evidence-Graduated Nutrition Recommendations

- Status: Accepted
- Date: 2026-08-14

## Context

NutriApp combines user-reported health conditions, laboratory results, profile data,
meal intake, and deterministic nutrition calculations. The product must remain useful
when health data is incomplete without presenting a diagnosis or inventing clinical
certainty.

NutriApp supports nutrition decision-making and education. It is not a replacement
for clinical diagnosis or individualized medical care.

## Decision

NutriApp explains available evidence but does not diagnose diseases. User-reported
conditions provide policy context, but are not treated as clinically verified
diagnoses. Disease-specific policies require the relevant policy context. Future
sources may include clinician-confirmed or imported data.

Condition policies are deterministic implementations of selected evidence-based
clinical guidelines and policies, such as KDIGO, KDOQI, ADA, or AHA guidance. They
must not be arbitrary application logic. Each policy must identify its source and
version and explicitly define the evidence required before it can produce a specific
recommendation.

Laboratory findings may be interpreted neutrally without a disease diagnosis. An
abnormal result without a reported condition can produce an explanation, monitoring,
and appropriate clinical follow-up, but must not activate a disease-specific policy.

Raw laboratory results are the source of truth. Interpreted findings are derived
application objects used by policy evaluation and are not persisted unless a future
requirement clearly justifies persistence.

When evidence is incomplete, the application should remain useful through general
education and monitoring while explaining what information would enable greater
personalization.

The core product principle is to provide the most specific safe recommendation
supported by the available evidence. Each condition policy decides whether its own
evidence requirements are satisfied. When evidence is incomplete, conflicting, stale,
or insufficient, the application remains useful through general guidance, monitoring,
and education while explaining what additional information would improve
personalization. It must never infer diagnoses or apply disease-specific restrictions
beyond an explicitly approved condition policy.

The shared product layer describes the resulting recommendation; it does not decide
clinical applicability for every condition.

Safety disposition and clinical follow-up are independent of recommendation
specificity. A highly personalized recommendation may still require clinician review,
and incomplete evidence may require follow-up without preventing general guidance.

## Recommendation behavior

| Available context | Permitted behavior |
| --- | --- |
| No condition and no laboratory data | General nutrition education and intake monitoring |
| No reported diagnosis with laboratory data | Neutral laboratory explanation, monitoring, general guidance, and follow-up when appropriate |
| User-reported condition without relevant laboratory data | General condition education, monitoring, and explanation of missing information |
| Condition with limited relevant laboratory data | Personalized monitoring and neutral findings |
| Condition with all policy-required evidence | Deterministic policy guidance and target adjustments |
| Condition with policy-required treatment context | Treatment-specific guidance when the selected policy supports it |
| Conflicting, stale, or insufficient data | Less-specific guidance, explanation of limitations, and clinical follow-up when appropriate |

These outcomes are not a universal clinical confidence score. Specificity is evaluated
per recommendation, and each condition may require a different combination of
conditions, laboratory values, dates, profile fields, and treatment status.

## Architectural boundaries

- Repositories persist and retrieve raw source data.
- Laboratory interpreters produce neutral application findings and do not diagnose.
- Condition policies own their evidence requirements and deterministic decisions.
- Target calculators derive numeric targets only when the applicable policy permits it.
- Insight evaluation compares calculated intake with supplied targets.
- Target adjustments preserve provenance, including the reason and policy source when available.
- Controllers and response mappers own HTTP contracts.

Food restrictions, allergies, contraindications, and other safety policies are not
treated as ordinary nutrition optimization rules. They require separate policy
decisions and may have stricter evidence requirements.

## Explicit non-goals

This decision does not introduce:

- a generic rule engine;
- a shared policy evaluator;
- a numeric evidence score;
- a diagnosis engine;
- a universal recommendation context;
- automatic food blacklists from a condition alone;
- automatic CKD staging from a single laboratory result.

Shared abstractions should be added only when multiple implemented policies demonstrate
the same requirement.

## Consequences

The product can provide safe, useful guidance at every evidence level while avoiding
false precision. Condition policies remain independently testable and can evolve at
different rates. The tradeoff is that policies may initially contain explicit,
condition-specific evidence checks and may not share a generalized execution model.

The first CKD policy must explicitly define its required condition context, laboratory
evidence, recency/chronicity behavior, treatment requirements, affected nutrients,
missing-data behavior, clinical follow-up behavior, and policy source/version before
it changes nutrition targets.
