# ADR 0003: General Nutrition Policy

- Status: Proposed
- Date: 2026-08-17

## Context

NutriApp's evaluation and recommendation foundations are deterministic, versioned,
and policy-driven. Sodium is currently the primary active compatibility policy,
while several other nutrients are represented as contributions or remain deferred
until an approved policy exists.

The recommendation layer should not grow by adding generic heuristics around these
contributions. It needs an approved, condition-agnostic policy group that provides
population-level nutrition references without diagnosing, prescribing, or applying
condition-specific restrictions.

The first policy group will be General Nutrition. It will provide general-population
reference guidance and baseline nutrient comparisons, while remaining independent
from future Cardiovascular, Diabetes, CKD/Dialysis, medication, laboratory, and
other policy groups.

## Decision

NutriApp will implement a `General Nutrition` policy group as a condition-agnostic
source of population-level nutrition guidance.

The group will:

- define approved general-population reference values for selected nutrients;
- distinguish population references from personalized or clinical targets;
- consume canonical nutrient calculations and immutable evaluation snapshots;
- provide applicability, contribution, and deferral facts to evaluation and
  recommendation layers;
- remain independent from disease, medication, laboratory, and treatment policies;
- expose complete guideline, reference-value, evaluator, and policy provenance.

The group will not replace `FoodEvaluationEngine`, `NutritionPolicyService`,
`EnergyPolicy`, or the recommendation resolver.

## Authoritative sources and versions

The primary qualitative source is the **Dietary Guidelines for Americans,
2025-2030, 10th edition**, issued jointly by the U.S. Department of Health and
Human Services and the U.S. Department of Agriculture. It is the current edition
at the time of this ADR. See the [official Dietary Guidelines page](https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines)
and the [official Dietary Guidelines site](https://www.dietaryguidelines.gov/).

Numeric reference values for the initial implementation will use the FDA Daily
Value reference table associated with Nutrition Facts labeling, under 21 CFR
101.9. The FDA reference identifies values such as sodium 2,300 mg, dietary fiber
28 g, added sugars 50 g, saturated fat 20 g, and cholesterol 300 mg. See the
[FDA Daily Value reference](https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels).

The authoritative food-composition source is **USDA FoodData Central**. It supplies
food identity, food data type, portion information, and canonical nutrient values
used by the deterministic evaluation pipeline. See the [USDA FoodData Central
source](https://fdc.nal.usda.gov/) and its [data documentation](https://fdc.nal.usda.gov/data-documentation/).

These sources have different roles:

| Source | Governs | Does not govern |
| --- | --- | --- |
| Dietary Guidelines for Americans, 2025-2030 | General nutrition recommendations, qualitative guidance, and policy intent | Food composition values or individualized clinical targets |
| FDA Daily Values / 21 CFR 101.9 | Standardized nutrition-label reference values and numeric daily reference amounts where appropriate | Food composition values or disease-specific targets |
| USDA FoodData Central | Food identity, portion data, and nutrient composition values | Nutrition policy intent, target applicability, or clinical recommendations |

General Nutrition must not reinterpret or implicitly combine these sources. Each
policy decision must identify which authoritative source governs that decision and
preserve that source and version in provenance.

If authoritative sources disagree, or if they serve different purposes, the policy
must document which source governs the specific decision. It must not create an
unreviewed merged value or imply that a food-composition source establishes policy
intent. An unresolved disagreement is a deferral condition.

The implementation must store source name, URL, edition or regulatory reference,
effective/retrieval date, and policy version. A source update creates a new policy
version and new derived evaluations; it does not rewrite historical snapshots.

## Scope and objectives

General Nutrition v1 will:

- provide evidence-backed population-reference comparisons;
- make selected nutrient contributions more meaningful than unqualified display
  values;
- support positive, caution, improvement, educational, and deferred explanations;
- provide a stable baseline that future condition-specific policies can supersede
  on individual nutrient dimensions;
- work with current food, current meal, daily, weekly, and historical contexts when
  the required evidence exists.

Broad food-pattern guidance may be educational output only when the required food
classification evidence exists. It must not be inferred from one nutrient or a
food name alone.

## Eligibility and exclusions

General Nutrition is eligible when recorded food data has canonical nutrient
amounts and an evaluation context. A complete profile is not required for fixed
population-reference comparisons.

For the initial product model:

- adult users may receive General Nutrition guidance;
- users with unknown age may receive clearly labeled general-reference guidance,
  but not life-stage-personalized guidance;
- users identified as children, pregnant, lactating, or requiring another
  life-stage-specific approach are deferred until an approved life-stage policy;
- specialized therapeutic diets, enteral nutrition, supplement regimens, and
  clinician-prescribed targets are outside this policy;
- a reported condition does not activate a General Nutrition restriction;
- a condition-specific policy may supersede a General Nutrition reference for the
  nutrient dimensions it owns.

Eligibility is evaluated per policy output. One unavailable nutrient must not
invalidate unrelated general-reference outputs.

## Required profile and evidence

General Nutrition requires:

- canonical nutrient data for the food, meal, or aggregate;
- an eligible evaluation snapshot for historical or snapshot-backed output;
- the applicable General Nutrition policy version and reference-value set.

Profile fields such as age, sex, weight, activity level, and nutrition goal are not
required for fixed population-reference values. General Nutrition must not use
them to invent personalized targets.

Current calorie calculations remain owned by `EnergyPolicy`. The Mifflin-St Jeor
maintenance result and its provenance are not replaced by a General Nutrition
reference value.

## Nutrients covered

General Nutrition v1 will provide policy-backed reference behavior for:

| Nutrient | Reference direction | Initial reference |
| --- | --- | --- |
| Sodium | Upper reference | 2,300 mg/day |
| Saturated fat | Upper reference | 20 g/day |
| Added sugars | Upper reference | 50 g/day |
| Cholesterol | Upper reference | 300 mg/day |
| Dietary fiber | Lower reference | 28 g/day |

These are population-level reference values associated with the selected FDA Daily
Value source. They are not automatically personalized clinical targets.

The following remain outside General Nutrition v1 target policy:

- calories, which remain owned by `EnergyPolicy`;
- protein, which remains governed by existing target and future condition policies;
- total carbohydrates, which remain contribution-only until an approved product
  policy defines their use;
- potassium and phosphorus, which remain informational until approved policy
  behavior and condition interaction boundaries are established;
- vitamins and minerals not already supported by the canonical evaluation model.

Adding a nutrient requires a new policy decision, source and version, applicability
rules, target semantics, and tests.

## Target calculations and applicability

General Nutrition v1 uses fixed population-reference values rather than profile-
derived calculations. Each value must identify whether it is:

- an upper reference, where lower intake is generally preferred within the policy;
- a lower reference, where meeting the reference supports general nutrition
  guidance;
- informational only, where no approved comparison is available.

The policy must not calculate calories, weight-loss deficits, muscle-gain targets,
condition-specific limits, medication thresholds, or laboratory-derived targets.

Existing sodium behavior must be reconciled so the 2,300 mg general reference is
owned by the General Nutrition baseline while a future condition policy may provide
an approved adjustment. A condition adjustment must preserve its own provenance
and must not be silently represented as a General Nutrition value.

Target outputs must include nutrient identifier, amount, unit, direction,
applicability, source, source version, policy ID, policy version, and explanation.

## Deferral conditions

General Nutrition must defer a specific output when:

- the required nutrient is absent or invalid in canonical data;
- the evaluation snapshot is missing, malformed, incompatible, or outside the
  permitted as-of period;
- the user is in an unsupported life stage or specialized nutrition context;
- the reference source or policy version is unavailable;
- a required source-specific interpretation has not been approved;
- a condition-specific policy owns the nutrient dimension and General Nutrition is
  not the applicable authority for that output;
- aggregate data is incomplete for a daily, weekly, or historical conclusion.

Deferral is scoped per nutrient and context. Sodium may remain evaluable when
fiber data is missing, and a current food may remain evaluable when a historical
period lacks sufficient coverage.

Deferral explanations must state what is unavailable or superseded without
implying a diagnosis or that a clinical target was calculated.

## Stable identifiers

The policy group identifier is:

```text
general-nutrition
```

The initial version is:

```text
general-nutrition-v1
```

Nutrient-specific policy identifiers should remain stable and composable:

```text
general-nutrition-sodium-v1
general-nutrition-saturated-fat-v1
general-nutrition-added-sugars-v1
general-nutrition-cholesterol-v1
general-nutrition-fiber-v1
```

Changing a source, threshold, applicability rule, or interpretation requires a
new version. Historical snapshots and recommendations retain the version that
produced them.

## Provenance requirements

Every General Nutrition target, evaluation fact, deferral, and recommendation
input must preserve:

- policy group ID and policy version;
- nutrient-specific policy ID and version where applicable;
- guideline name, edition, source URL, and relevant section or reference;
- FDA or regulatory reference and retrieval/effective metadata when a Daily Value
  is used;
- USDA FoodData Central data type, food identifier, release/version, and source
  URL when food composition is used;
- evaluator version;
- immutable evaluation snapshot ID and snapshot version when applicable;
- target amount, unit, direction, and interpretation;
- evaluation timestamp and reporting period;
- limitations and deferral reason where applicable.

The policy must never rely on an unversioned constant or display-name match as the
authoritative source of a target.

## User-facing explanations

General Nutrition explanations must:

- identify the nutrient and observed contribution or aggregate;
- identify the population reference when a comparison is made;
- distinguish "general reference" from "personalized target";
- explain whether guidance is positive, cautionary, educational, or deferred;
- avoid diagnostic, prescriptive, or disease-specific language;
- disclose incomplete data or unsupported applicability;
- avoid implying that one food or one day determines overall health.

Example:

> "This portion contributes 100 mg of sodium toward the general reference of
> 2,300 mg per day. A condition-specific target may differ when an approved policy
> applies."

This communication is downstream of deterministic policy output. AI may rephrase
an approved explanation but may not create or strengthen its claim.

## Interaction with future condition-specific policies

General Nutrition, Cardiovascular, Diabetes, and CKD/Dialysis are independent
policy groups. Each group owns its evidence requirements, affected nutrients,
target adjustments, deferral behavior, guideline sources, and version lifecycle.

They are composable because:

- each policy produces explicit, typed outputs rather than mutating another policy;
- each nutrient dimension identifies its authority and provenance;
- condition-specific policies may supersede a general reference only for the
  dimensions they explicitly own;
- unrelated General Nutrition outputs remain available when safe and applicable;
- shared target, snapshot, recommendation, and resolver layers contain no
  disease-specific branching.

The composition layer must define precedence when two applicable policies address
the same nutrient. The more specific approved policy wins for that dimension,
while the general policy remains available for non-conflicting dimensions. If
precedence or applicability cannot be established, the output is deferred rather
than merged through an arbitrary numeric rule.

General Nutrition must not inspect condition names, laboratory values, medications,
dialysis status, or treatment context to decide clinical applicability. Those
decisions belong to the relevant future policy.

## Explicit non-goals

This ADR does not introduce:

- CKD, dialysis, diabetes, cardiovascular, medication, or laboratory policies;
- diagnosis, staging, treatment advice, or clinical prescriptions;
- personalized calorie, weight-loss, muscle-gain, or weight-gain targets;
- automatic food blacklists or contraindications;
- supplement recommendations;
- pregnancy, lactation, pediatric, or other life-stage-specific policy logic;
- new canonical nutrient calculations;
- a generic rule engine;
- changes to recommendation framework contracts;
- AI-generated nutrient values, targets, or recommendations;
- implementation code or migration behavior.

## Consequences

General Nutrition will provide a richer deterministic evidence base for
`RecommendationService` without changing its architecture. Recommendations can
become more useful for sodium, saturated fat, added sugars, cholesterol, and fiber
while preserving contribution-only behavior for nutrients outside the approved
scope.

The policy group requires explicit source and version management, nutrient-level
applicability, and careful reconciliation with the existing sodium baseline. This
prevents general-population references from being mistaken for individualized
clinical targets and allows future condition-specific policies to evolve
independently.

The next milestone after ADR approval is implementation of General Nutrition v1,
including policy outputs, target provenance, deferral behavior, snapshot
compatibility, and independent tests.
