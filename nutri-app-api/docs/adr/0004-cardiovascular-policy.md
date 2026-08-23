# ADR 0004: Cardiovascular Nutrition Policy

- Status: Proposed
- Date: 2026-08-17

## Context

General Nutrition v1 now provides condition-agnostic population references for
sodium, saturated fat, added sugars, cholesterol, and dietary fiber. Those
references are useful baselines, but they must not be treated as individualized
cardiovascular targets.

NutriApp needs a separate Cardiovascular policy group for approved, evidence-based
guidance that depends on a cardiovascular context. The group must remain
independent from General Nutrition, Diabetes, CKD/Dialysis, medication, laboratory,
and treatment policies. It must compose with those groups without silently
overwriting their outputs or creating conflicting clinical advice.

## Decision

NutriApp will define a versioned `Cardiovascular` policy group for cardiovascular
nutrition guidance. The group will:

- consume canonical nutrient values and existing target/evaluation outputs;
- require an explicitly supported cardiovascular context before applying
  condition-specific behavior;
- produce typed target adjustments, applicability facts, deferrals, and explanations;
- identify the governing evidence source for every decision;
- preserve policy, guideline, evaluator, snapshot, and food provenance;
- remain independently testable and composable through the existing policy pipeline;
- allow multiple cardiovascular subpolicies to evolve independently.

The group will not replace `FoodEvaluationEngine`, `NutritionPolicyService`,
`NutritionTargetCalculator`, `EnergyPolicy`, `General Nutrition`, or the
recommendation resolver. It will not introduce a second nutrient-calculation or
scoring path.

## Recommendation principles inherited from the policy architecture

Cardiovascular policies must follow the same governing rules established by the
recommendation and General Nutrition ADRs:

1. Policies never recalculate canonical nutrients or duplicate evaluation logic.
2. Policies never diagnose, prescribe, or replace professional medical judgment.
3. Outputs are deterministic for the same evidence, context, and policy versions.
4. Every output is explainable and evidence-backed.
5. Every policy decision is versioned and reproducible from immutable snapshots.
6. AI may assist with extraction, recognition, or explanation only; it cannot select
   a cardiovascular target or invent clinical guidance.

## Authoritative sources and source governance

The primary cardiovascular nutrition source proposed for this ADR is the **2026
Dietary Guidance to Improve Cardiovascular Health: A Scientific Statement from the
American Heart Association**, updated March 31, 2026. It provides food-based
cardiovascular-health optimization and CVD-risk-reduction guidance and updates the
2021 AHA dietary guidance statement. See the [official AHA statement page](https://professional.heart.org/en/science-news/2026-dietary-guidance-to-improve-cardiovascular-health)
and the linked Circulation publication.

The **2023 AHA/ACC/ACCP/ASPC/NLA/PCNA Guideline for the Management of Patients
With Chronic Coronary Disease** may govern policies specifically scoped to
documented chronic coronary disease. It must not be used as a general-population
source or applied without the required supported condition context. See the
[official guideline publication](https://www.ahajournals.org/doi/10.1161/CIR.0000000000001168).

USDA FoodData Central remains the authoritative source for food identity, portions,
and nutrient composition. FDA Daily Values and the Dietary Guidelines for
Americans remain authoritative for their existing General Nutrition roles; they do
not automatically govern cardiovascular-specific adjustments.

These sources have distinct responsibilities:

| Source | Governs | Does not govern |
| --- | --- | --- |
| AHA 2026 dietary guidance | Cardiovascular food-pattern guidance and cardiovascular policy intent | Canonical food composition or individualized treatment targets |
| AHA/ACC chronic coronary disease guideline | Decisions explicitly scoped to documented chronic coronary disease | General-population or unrelated condition guidance |
| USDA FoodData Central | Food identity, serving data, and nutrient composition | Cardiovascular policy intent or target applicability |
| FDA Daily Values / 21 CFR 101.9 | Standardized nutrition-label reference values where a policy explicitly adopts them | Cardiovascular-specific clinical targets |

The Cardiovascular group must not implicitly merge sources. Each decision must
name its governing source, edition/version, effective date or regulatory
reference, and policy version. If sources disagree, have different scopes, or do
not establish the requested numeric behavior, the policy must document the
governing source or defer. It must not invent a blended threshold.

## Scope and objectives

Cardiovascular v1 is intended to:

- provide cardiovascular-context guidance for supported users and contexts;
- express cardiovascular-specific adjustments or educational guidance only where
  an approved source supports them;
- reuse General Nutrition outputs as baseline evidence rather than duplicate them;
- support current food, meal, daily, weekly, and historical contexts when the
  required snapshot and aggregate evidence exists;
- provide a migration path for existing cardiovascular-related adjustments, such as
  hypertension sodium behavior, after explicit ownership and provenance review.

The first implementation should be one independently testable subpolicy. The
specific nutrient, context, threshold, and deferral behavior must be approved in
that subpolicy's implementation plan before code is written.

## Eligibility and exclusions

Cardiovascular policy output is eligible only when:

- the relevant cardiovascular context is represented by an approved, stable
  condition or risk-context identifier;
- required evidence is current, valid, and within the policy's approved scope;
- canonical nutrient data or an immutable evaluation snapshot is available for the
  requested context;
- no higher-priority policy owns the same decision without an explicit conflict
  rule.

The group must defer when the condition is unknown, unsupported, stale, ambiguous,
or missing required evidence. A reported condition must not automatically imply a
target unless an approved Cardiovascular subpolicy explicitly maps it.

The following are excluded from Cardiovascular v1:

- diagnosis, risk scoring, prognosis, or treatment selection;
- medication changes or medication-nutrient interaction decisions;
- laboratory interpretation or lipid-treatment thresholds;
- CKD, dialysis, diabetes, pregnancy, pediatric, or other specialized policies;
- calorie prescriptions, weight-loss deficits, or exercise prescriptions;
- unsourced food classifications inferred from a food name alone;
- automatic replacement of General Nutrition targets without explicit ownership.

## Required profile and evidence

Requirements are subpolicy-specific, but may include:

- an approved cardiovascular condition or risk-context code;
- relevant profile data only when the approved policy requires it;
- current laboratory or medication evidence only after separate approved contracts
  and policy ownership exist;
- canonical nutrient contributions for current food or meal evaluation;
- an immutable evaluation snapshot for historical output;
- the exact General Nutrition and Cardiovascular policy versions used for any
  baseline comparison or adjustment.

Missing or conflicting evidence produces a scoped deferral, not a guessed target.

## Nutrients and policy ownership

Cardiovascular v1 may consume these General Nutrition dimensions as evidence:

- sodium;
- saturated fat;
- added sugars;
- cholesterol;
- dietary fiber.

Consuming a dimension does not grant ownership of its General Nutrition target.
Each Cardiovascular subpolicy must declare whether it is:

- informational or educational only;
- an approved cardiovascular-specific adjustment;
- a superseding target for a defined context; or
- deferred pending a more specific policy.

No cardiovascular policy may silently mutate another policy's target. When two
policies address the same dimension, the resolver must use an explicit stable
conflict key and configured precedence, with both policy provenances preserved.

### Policy precedence

For a shared nutrient dimension, precedence is deterministic and applies in this
order:

1. An explicitly applicable condition-specific policy outranks a general
   population reference for the decision it owns.
2. A policy with a narrower approved context outranks a broader policy only when
   the required context evidence is present and the policy declares that
   ownership.
3. Policy version recency does not create precedence. A newer version is not
   automatically more authoritative than a more specific policy or a different
   governing source.
4. If policies remain tied, conflict resolution must not guess. The decision is
   deferred and the conflict, candidate policies, and provenance are preserved.

The stable conflict key must identify the decision dimension rather than the
implementation class. For example:

```text
nutrition-target:sodiumMilligrams:daily-upper-limit
```

The winning output must preserve the losing baseline as supporting evidence when
it was considered. This makes an explicit Cardiovascular override traceable to the
General Nutrition reference instead of appearing as an unexplained replacement.

## Target calculations and applicability

Cardiovascular targets must be derived only from approved policy rules. A policy
may use a fixed threshold, a bounded range, or a documented comparison against a
General Nutrition reference, but must declare its direction, unit, applicability,
and evidence requirements.

Profile-derived or laboratory-derived calculations are not allowed until their
inputs, formulas, evidence source, validation, and deferral behavior are approved
by a dedicated subpolicy. The evaluation engine remains policy-agnostic.

## Deferral conditions

Cardiovascular policies must defer a specific output when:

- the cardiovascular context is unsupported or not confirmed;
- required condition, profile, laboratory, medication, or snapshot evidence is
  missing, stale, malformed, or conflicting;
- the governing source does not establish the requested numeric interpretation;
- another policy owns the decision and no approved precedence exists;
- aggregate coverage is insufficient for daily, weekly, or historical guidance;
- the food or nutrient classification required by the policy is unavailable.

Deferrals must identify the owning policy, reason, evidence limitation, and safe
user-facing explanation. They must not imply that a diagnosis or clinical target
was produced.

## Stable identifiers and versioning

The policy group identifier is:

```text
cardiovascular
```

The initial group version is:

```text
cardiovascular-v1
```

Each subpolicy must have its own stable identifier, for example:

```text
cardiovascular-<decision>-v1
```

Changing a source, threshold, formula, eligibility rule, interpretation, or
precedence rule requires a new policy version. Historical snapshots and
recommendations retain the versions that produced them and are never silently
rewritten.

## Provenance and historical reproducibility

Every Cardiovascular output must preserve:

- cardiovascular policy ID and version;
- governing source identity, URL, edition/version, and effective date;
- any secondary source used for a separately governed decision;
- General Nutrition policy ID/version when used as baseline evidence;
- evaluator version and immutable snapshot identity when snapshot-backed;
- input context identifiers and evaluation timestamp;
- rationale, applicability, and any deferral reason.

Historical analytics must consume the immutable snapshot and its recorded policy
payload. Re-running current policies may produce a new result, but must not alter
the historical result.

## Interaction with future policy groups

Cardiovascular, General Nutrition, Diabetes, CKD/Dialysis, medication, and
laboratory policies are independent policy groups. Each owns its evidence
requirements, decisions, provenance, and version lifecycle.

They are composable because policies emit explicit outputs and candidates rather
than mutating shared nutrient calculations. Overlap is resolved through declared
ownership and shared resolver configuration. If a future clinical policy is more
specific, the supersession must be explicit, versioned, explainable, and preserved
in the resulting snapshot.

## Non-goals

This ADR does not approve:

- a specific Cardiovascular nutrient target or adjustment;
- implementation of a Cardiovascular policy;
- changes to `RecommendationService` or recommendation contracts;
- changes to General Nutrition v1 behavior;
- a shared evidence catalog;
- diagnosis, treatment, medication, laboratory, or risk-scoring functionality.

Those decisions require a focused subpolicy proposal or implementation milestone
with its own evidence and tests.

## Consequences

The Cardiovascular group can add clinically scoped behavior without changing the
evaluation engine, recommendation architecture, or General Nutrition policies.
The cost is that each subpolicy must explicitly define context, evidence,
ownership, precedence, deferral, and provenance before implementation. This cost
is intentional: cardiovascular guidance must remain auditable and must not be
inferred from generic nutrient heuristics.
