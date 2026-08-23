# ADR 0006: CKD and Dialysis Nutrition Policy

- Status: Proposed
- Date: 2026-08-17

## Context

NutriApp has established General Nutrition, Cardiovascular, and Diabetes policy
groups. CKD/Dialysis is the next clinical policy group because the backend already
has condition, eGFR, body-weight, and dialysis-status evidence, while the current
CKD protein path remains intentionally narrow and requires formal evidence
ownership, provenance, and versioning.

CKD and dialysis must not be represented as one undifferentiated severity scale.
Dialysis changes the applicable nutritional context and may require different
targets, evidence, and deferral rules. Hemodialysis and peritoneal dialysis are
also distinct contexts even if the first implementation supports only one of them.

## Decision

NutriApp will define a versioned `CKD/Dialysis` policy group composed of
independently owned subpolicies. The group will:

- distinguish non-dialysis CKD, hemodialysis, and peritoneal dialysis contexts;
- require explicit, supported context evidence before applying a subpolicy;
- consume canonical nutrient values, existing target outputs, laboratory evidence,
  dialysis-status evidence, and immutable evaluation snapshots;
- preserve General Nutrition and other lower-precedence outputs as supporting
  evidence when a CKD/Dialysis policy owns the same decision;
- produce deterministic targets, applicability facts, scoped deferrals, and
  explainable provenance;
- remain independent from General Nutrition, Cardiovascular, Diabetes,
  medication, and treatment policies;
- allow each context-specific subpolicy to be independently versioned and tested.

The group will not replace the evaluation engine, target calculator, snapshot
model, recommendation resolver, or clinician-directed renal nutrition care.

## Context model and policy ownership

The policy group defines three related but independent context families:

| Context | Meaning | Does not imply |
| --- | --- | --- |
| `ckd-non-dialysis` | Supported CKD context with no active dialysis status | Hemodialysis, peritoneal dialysis, or a specific CKD stage unless separately evidenced |
| `hemodialysis` | Active hemodialysis context | Peritoneal dialysis or a universal dialysis target |
| `peritoneal-dialysis` | Active peritoneal dialysis context | Hemodialysis or a universal dialysis target |

An active dialysis context is not treated as advanced non-dialysis CKD. A
dialysis subpolicy owns its explicitly supported context and takes precedence over
non-dialysis CKD only when the required dialysis evidence is present and valid.
Peritoneal dialysis remains a first-class future context even when no policy is
implemented for it.

Conflicting or simultaneously reported dialysis contexts must defer until the
context is resolved. CKD condition presence alone must not infer dialysis status,
CKD stage, treatment modality, or a numeric nutrition target.

## Authoritative sources and source roles

The **KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of
CKD** governs CKD definition, classification context, evidence boundaries, and CKD
management guidance within the decisions it explicitly covers. KDIGO identifies
its 2024 guideline as the current global CKD standard at the time of this ADR.

The **KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update**
governs nutrition-specific decisions within its approved scope, including protein,
energy, micronutrient, and electrolyte guidance. Its scope and applicability must
be checked separately for non-dialysis and dialysis contexts before a subpolicy
uses a recommendation.

The **KDIGO CKD-MBD guideline** may govern mineral and bone disorder decisions
only when a future subpolicy explicitly adopts that source and models the required
laboratory evidence. It does not automatically establish phosphorus or calcium
food targets for this ADR.

USDA FoodData Central remains authoritative for food identity, serving data, and
canonical nutrient composition. FDA Daily Values remain authoritative only for
their existing General Nutrition labeling/reference role.

| Source | Governs | Does not govern |
| --- | --- | --- |
| KDIGO 2024 CKD guideline | CKD context, classification boundaries, and decisions explicitly covered by the guideline | Canonical food composition or individualized renal diet orders |
| KDOQI Nutrition in CKD 2020 Update | Nutrition-specific CKD decisions explicitly covered by the nutrition guideline | Medication changes, diagnosis, or unsupported modality-specific extrapolation |
| KDIGO CKD-MBD guideline | Future CKD-MBD decisions explicitly owned by an approved subpolicy | All phosphorus, potassium, calcium, or vitamin targets by default |
| USDA FoodData Central | Food identity, portions, and nutrient values | CKD/Dialysis policy intent or target applicability |
| FDA Daily Values | Standardized nutrition-label references where explicitly adopted | CKD/Dialysis clinical targets |

Sources must not be implicitly merged. Every decision identifies one governing
source, section, edition/version, effective date, and policy version. Supporting
sources may be preserved as evidence but do not become co-governing by implication.
If sources disagree, have different purposes, or do not establish the requested
numeric behavior, the subpolicy documents the governing source or defers.

Primary source references:

- [KDIGO 2024 CKD Guideline](https://kdigo.org/guidelines/ckd-evaluation-and-management/kdigo-2024-ckd-guideline/)
- [KDOQI Nutrition in CKD](https://www.kidney.org/professionals/kdoqi/guidelines-and-commentaries/nutrition-ckd)
- [KDIGO Guidelines](https://kdigo.org/guidelines/)

## Scope and objectives

CKD/Dialysis v1 will:

- provide evidence-backed nutrition guidance for explicitly supported kidney
  contexts;
- separate non-dialysis CKD from hemodialysis and peritoneal dialysis;
- use current laboratory and dialysis-status evidence without diagnosing or
  interpreting treatment needs;
- support deterministic target evaluation, daily summaries, historical snapshots,
  and future recommendations when the required evidence exists;
- preserve baseline policies and all evidence used in precedence decisions.

## Required profile and evidence

Subpolicies may require:

- an approved CKD context identifier;
- current eGFR or other explicitly approved laboratory evidence;
- dialysis modality and active/inactive status;
- profile weight or other measurements only when the governing source and formula
  require them;
- canonical nutrient contributions for current evaluation;
- immutable snapshots for historical output;
- evidence timestamps and freshness rules defined by the subpolicy.

Laboratory freshness is policy-specific and must not be assumed globally. A result
outside the approved freshness window, malformed evidence, missing modality, or
conflicting evidence produces a scoped deferral.

## Precedence and conflict resolution

For a shared nutrient dimension:

1. An applicable dialysis-specific policy outranks non-dialysis CKD for the
   decision it explicitly owns.
2. An applicable CKD-specific policy outranks General Nutrition only for the
   decision it explicitly owns.
3. Hemodialysis and peritoneal-dialysis policies are peers; neither wins by
   policy version or implementation order.
4. Policy version recency never determines precedence.
5. Unresolved context or policy conflicts defer rather than guess.

Stable conflict keys identify decision dimensions, for example:

```text
nutrition-target:proteinGrams:daily-target
nutrition-target:phosphorusMilligrams:daily-upper-limit
```

The selected output preserves lower-precedence targets and provenance as
supporting evidence. A policy must not silently overwrite General Nutrition,
Cardiovascular, or Diabetes outputs.

## Deferral conditions

CKD/Dialysis subpolicies defer when:

- CKD context is absent, unsupported, or ambiguous;
- active dialysis status is missing or contradictory;
- dialysis modality is missing, stale, or unsupported;
- required laboratory evidence is missing, stale, malformed, or conflicting;
- required profile measurements are unavailable or invalid;
- the governing source does not establish the requested numeric behavior;
- another policy owns the decision and no explicit precedence applies;
- historical snapshot coverage is insufficient;
- the request would require diagnosis, medication advice, or treatment selection.

Deferrals identify the owning policy, reason, evidence limitation, and safe
user-facing explanation. They do not imply a diagnosis or prescribe a renal diet.

## Stable identifiers and versioning

The policy group identifier is:

```text
ckd-dialysis
```

Subpolicy identifiers use stable context and decision ownership:

```text
ckd-non-dialysis-<decision>-v1
hemodialysis-<decision>-v1
peritoneal-dialysis-<decision>-v1
```

Changing evidence, applicability, freshness, thresholds, formulas, precedence,
or interpretation requires a new policy version. Historical snapshots and
recommendations retain the versions that produced them.

## Provenance and historical reproducibility

Every output preserves:

- policy identifier and version;
- governing source, section, edition/version, URL, and effective date;
- context and applicability evidence;
- laboratory and dialysis-status evidence timestamps;
- General Nutrition or other baseline policy provenance used in comparison;
- evaluator version and immutable snapshot identity when snapshot-backed;
- rationale, formula inputs, and deferral reason.

Historical outputs are reconstructed from immutable snapshots and recorded policy
payloads. Future policy changes create new outputs and never silently rewrite past
results.

## First implementation recommendation

After this ADR is approved, the first vertical should formalize the
`ckd-non-dialysis-protein-v1` policy.

This is the highest-value first step because the existing backend already has the
necessary weight, eGFR, CKD condition, and inactive-dialysis evidence path. It can
replace the provisional CKD protein behavior with explicit KDOQI/KDIGO provenance,
stable ownership, freshness checks, and deterministic deferrals without inventing
dialysis assumptions.

For this first vertical, an eGFR result is considered current for 365 days from
collection. This is an application evidence-freshness rule for deterministic
applicability, not a claim that all clinical decisions can safely use an eGFR for
that duration. Future subpolicies may define narrower freshness requirements.

Dialysis-specific protein policies should follow independently, beginning with
hemodialysis only after its exact evidence and target rules are approved. Peritoneal
dialysis should then receive its own policy rather than inheriting hemodialysis
behavior.

## Non-goals

This ADR does not approve:

- dialysis as a subtype of non-dialysis CKD;
- hemodialysis or peritoneal-dialysis numeric targets;
- phosphorus, potassium, calcium, fluid, or micronutrient targets;
- laboratory interpretation or diagnosis;
- medication interactions or medication changes;
- transplant, pediatric, pregnancy, acute kidney injury, or acute illness logic;
- treatment recommendations or clinician replacement;
- a shared evidence catalog;
- changes to the evaluation or recommendation architecture;
- implementation of the first vertical before subpolicy review.

## Consequences

CKD and dialysis policies can evolve independently while preserving deterministic
precedence, source governance, and historical reproducibility. The cost is
intentional: each modality and decision dimension requires its own evidence review,
freshness rule, applicability contract, and tests before becoming actionable.
