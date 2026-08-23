# ADR 0005: Diabetes Nutrition Policy

- Status: Proposed
- Date: 2026-08-17

## Context

NutriApp has completed the General Nutrition v1 policy group and has established
Cardiovascular sodium and saturated-fat policies. Diabetes nutrition guidance is
more individualized than a general population reference: meal patterns,
carbohydrate distribution, medication use, glucose data, diabetes type, life
stage, kidney function, and treatment goals can materially change the applicable
guidance.

The Diabetes policy group must therefore add clinically relevant evidence without
inventing a universal carbohydrate target or silently converting general reference
values into diabetes treatment instructions.

## Decision

NutriApp will define a versioned `Diabetes` policy group for approved,
condition-specific nutrition guidance. The group will:

- require an explicitly supported diabetes context before applying condition logic;
- consume canonical nutrients, existing policy outputs, and immutable snapshots;
- preserve General Nutrition as baseline evidence unless a Diabetes subpolicy
  explicitly owns a decision dimension;
- produce deterministic targets, applicability facts, scoped deferrals, and
  explainable provenance;
- remain independent from General Nutrition, Cardiovascular, CKD/Dialysis,
  medication, laboratory, and treatment policies;
- allow diabetes subpolicies to be independently versioned and tested.

The group will not replace the evaluation engine, target calculator, recommendation
resolver, or clinician-directed diabetes care.

## Authoritative sources and source roles

The primary diabetes source is the **American Diabetes Association Standards of
Care in Diabetes—2026**, especially Section 5, *Facilitating Positive Health
Behaviors and Well-being to Improve Health Outcomes*. The ADA Standards are updated
annually and include recommendations for diabetes nutrition therapy and
individualized eating plans. See the [ADA 2026 Standards collection](https://diabetesjournals.org/care/issue/49/Supplement_1)
and [Section 5](https://diabetesjournals.org/care/article/49/Supplement_1/S89/163932/5-Facilitating-Positive-Health-Behaviors-and-Well).

Additional ADA sections may govern only the decisions they explicitly cover, such
as obesity and weight management or cardiovascular risk management. They must not
be treated as a single merged rule set.

USDA FoodData Central remains authoritative for food identity, portions, and
canonical nutrient composition. FDA Daily Values remain standardized labeling
references for General Nutrition and may be used by a Diabetes policy only when an
approved decision explicitly adopts them.

| Source | Governs | Does not govern |
| --- | --- | --- |
| ADA Standards of Care in Diabetes—2026 | Diabetes nutrition-policy intent, applicability, and clinical evidence boundaries | USDA food composition or individualized treatment orders |
| USDA FoodData Central | Food identity, serving data, and nutrient values | Diabetes targets or medication decisions |
| FDA Daily Values / 21 CFR 101.9 | Standardized nutrition-label references when explicitly adopted | Universal diabetes treatment targets |

Sources must not be implicitly merged. Every decision identifies its governing
source, section, edition/version, effective date, and policy version. If the source
does not establish a numeric target or if authoritative sources serve different
purposes, the policy documents the governing source or defers rather than creating
a blended rule.

## Scope and objectives

Diabetes v1 will:

- provide evidence-backed guidance for supported diabetes contexts;
- distinguish general population references from diabetes-specific guidance;
- preserve individualization boundaries for carbohydrate distribution, energy,
  glucose management, and medical nutrition therapy;
- support current food, meal, daily, weekly, and historical contexts when required
  evidence exists;
- expose explicit deferrals when a target requires clinician-provided or
  user-specific evidence that NutriApp does not yet model.

## Eligibility and applicability

Diabetes policy output is eligible only when:

- an approved diabetes context identifier is present;
- the policy's required evidence is current, valid, and within scope;
- canonical nutrient data or an immutable evaluation snapshot is available;
- the policy has an explicit ownership and precedence rule for any shared nutrient
  dimension.

The group must distinguish diabetes type and life stage when the governing policy
requires that distinction. An unspecified diabetes condition must not be treated as
type 1, type 2, gestational diabetes, or prediabetes.

## Required profile and evidence

Requirements are subpolicy-specific and may include:

- approved diabetes type or context;
- profile and nutrition-goal data when relevant;
- a clinician- or user-approved carbohydrate target when a personalized target is
  required;
- current laboratory, glucose-monitoring, or medication evidence only after those
  inputs have approved contracts and ownership;
- canonical nutrient contributions for the requested food or aggregate;
- immutable snapshots and their recorded evaluator and policy versions for
  historical output.

Missing, stale, conflicting, or unsupported evidence produces a scoped deferral.

## Nutrients and ownership boundaries

Diabetes policies may consume:

- total carbohydrates;
- added sugars;
- dietary fiber;
- calories and energy context;
- sodium, saturated fat, and cholesterol when diabetes-specific evidence explicitly
  owns a decision.

Diabetes v1 does not establish a universal carbohydrate gram target. Carbohydrate
amount, timing, and distribution may require individualized medical nutrition
therapy or treatment context. A policy must defer when that target is not available.

General Nutrition references remain active unless a Diabetes subpolicy explicitly
supersedes a dimension. Any override preserves the General Nutrition baseline as
supporting evidence.

## Target calculations and precedence

Diabetes target calculations must be deterministic and derived only from approved
rules. A policy may use a fixed reference, an approved user-specific target, or a
documented comparison against a baseline, but it must declare units, direction,
applicability, required inputs, and evidence provenance.

Precedence follows the shared policy model:

1. An applicable Diabetes policy outranks General Nutrition only for a decision it
   explicitly owns.
2. A narrower diabetes context outranks a broader context only when its evidence
   is present.
3. Policy version recency does not determine precedence.
4. Unresolved conflicts defer rather than guess.

Stable conflict keys identify decision dimensions, for example:

```text
nutrition-target:carbohydrateGrams:daily-target
```

The exact first Diabetes target policy requires a separate implementation decision
and must not be inferred from this ADR alone.

## Deferral conditions

Diabetes policies defer a specific output when:

- diabetes type or context is missing or unsupported;
- a required individualized target is absent;
- glucose, laboratory, medication, or treatment evidence is missing, stale, or
  conflicting;
- the governing ADA source does not establish the requested numeric behavior;
- another policy owns the dimension and no explicit precedence exists;
- aggregate coverage is insufficient for daily, weekly, or historical guidance;
- food or nutrient classification required by the policy is unavailable.

Deferrals identify the policy, reason, evidence limitation, and user-facing
explanation. They must not imply diagnosis, medication advice, or a calculated
clinical treatment plan.

## Stable identifiers and versioning

The policy group identifier is:

```text
diabetes
```

The initial group version is:

```text
diabetes-v1
```

Each subpolicy uses a stable identifier of the form:

```text
diabetes-<decision>-v1
```

Changing evidence, eligibility, thresholds, formulas, applicability, precedence,
or interpretation requires a new version. Historical snapshots and
recommendations retain the versions that produced them.

## Provenance and historical reproducibility

Every Diabetes output preserves:

- Diabetes policy ID and version;
- governing ADA section, edition/version, URL, and effective date;
- any separately governed supporting source;
- General Nutrition or other policy IDs/versions used as baseline evidence;
- evaluator version and immutable snapshot identity when snapshot-backed;
- input context, evidence timestamp, rationale, applicability, and deferral reason.

Historical results are reconstructed from immutable snapshots and recorded policy
payloads. Current policy changes produce new outputs and never silently rewrite
historical results.

## Interaction with future policy groups

Diabetes, General Nutrition, Cardiovascular, CKD/Dialysis, medication, and
laboratory policies are independent, composable groups. Each owns its evidence,
decisions, provenance, and lifecycle. Shared nutrient dimensions are resolved by
explicit ownership, stable conflict keys, and configured precedence.

Diabetes policies must defer or coordinate when CKD/Dialysis, pregnancy, pediatric,
medication, or laboratory policies require more specific evidence. They must not
duplicate those policies' clinical logic.

## Non-goals

This ADR does not approve:

- a universal diabetes carbohydrate target;
- insulin dosing, medication changes, or hypoglycemia treatment;
- interpretation of glucose, A1C, lipid, or other laboratory results;
- diagnosis or classification of diabetes;
- pregnancy, pediatric, CKD/Dialysis, or cardiovascular-specific diabetes rules;
- a first Diabetes implementation policy;
- changes to the evaluation or recommendation architecture;
- a shared evidence catalog.

Those decisions require a focused, evidence-governed implementation proposal.

## Consequences

The Diabetes group can grow without weakening the deterministic architecture or
turning population references into treatment advice. The cost is intentional:
each subpolicy must establish its context, evidence, ownership, inputs, deferrals,
precedence, and provenance before implementation.
