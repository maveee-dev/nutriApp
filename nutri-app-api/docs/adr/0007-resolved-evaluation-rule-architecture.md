# ADR 0007: Resolved Evaluation Rule Architecture

- Status: Proposed
- Date: 2026-08-21

## Context

NutriApp currently resolves nutrition targets and the evaluation engine contains
implicit assumptions about how particular nutrients affect compatibility. This
works for the initial policy set, but it conflates food compatibility with daily
adequacy and makes future policy domains more likely to require nutrient-specific
branching.

A protein lower target is meaningful for meal and daily progress, but low protein
in a single fruit should not by itself make that fruit appear unsafe. Conversely,
an upper-limit rule such as sodium can meaningfully affect the compatibility of a
single serving.

Future policies may express upper limits, lower targets, recommended ranges,
restrictions, interactions, or other evidence-backed predicates. The architecture
needs a stable contract that can represent these decisions without making the
generic evaluator aware of nutrient names or clinical conditions.

## Decision

NutriApp will evolve the target-centric model toward a generic
`ResolvedEvaluationRule` model. Existing target policies remain valid during the
migration; a target is treated as one kind of evaluation rule rather than the
central abstraction.

The lifecycle is:

```text
Policy Registration
        ↓
Policy Evaluation
        ↓
Resolved Evaluation Rule
        ↓
Scope-specific Evaluator
        ↓
Immutable Evaluation Snapshot
```

Policy registration owns immutable clinical semantics. Policy evaluation resolves
user- and evidence-specific values. The resolver combines the static descriptor
and dynamic result into an effective rule. Evaluators consume rules according to
their declared semantics, roles, and scopes. Snapshots preserve the fully
resolved rule and its provenance.

## Layer responsibilities

### Policy Registration

Registrations define versioned, immutable metadata, including:

- stable policy identifier and version;
- rule type and direction;
- evaluation roles;
- applicable evaluation scopes;
- precedence and conflict-key ownership;
- policy dependencies;
- governing source identity.

Static semantics belong here because they are part of the policy’s clinical
meaning and policy-set fingerprint. A policy whose semantics materially change
must receive a new policy version or identifier.

### Policy Evaluation

Policy implementations resolve dynamic facts from the user profile and approved
evidence, including target amounts or ranges, applicability, laboratory and
context evidence, freshness, approval state, deferrals, and provenance.

Policy evaluation owns clinical predicates and applicability decisions. It may
produce non-nutrient predicates for future allergies, medication interactions, or
forbidden-food policies, but those predicates remain owned by the policy that
defines them.

### Resolved Evaluation Rule

`ResolvedRule` is a discriminated rule family rather than one universal DTO. All
subtypes share common metadata, while each subtype owns only the fields required
by its evaluation model:

```text
ResolvedRule
├── NumericConstraintRule
├── PredicateRule
└── InteractionRule
```

`NumericConstraintRule` represents upper limits, lower targets, and recommended
ranges. `PredicateRule` represents policy-owned boolean or categorical decisions.
`InteractionRule` represents relationships such as a food/medication interaction.

Every subtype shares:

- rule identity and version;
- rule type and direction;
- roles and scopes;
- resolved amount, range, or predicate;
- applicability;
- precedence and conflict key;
- deferrals;
- evidence and provenance.

The subtype-specific payload is intentionally not nullable across unrelated rule
types. Numeric rules contain numeric values or bounds; predicate rules contain a
policy-owned predicate reference and resolved result; interaction rules contain
the participating subjects and resolved interaction result. The rule must be
immutable after resolution.

### Scope-specific Evaluators

Evaluators interpret generic rule semantics and must not branch on nutrient names,
condition codes, or policy identifiers.

- Food compatibility evaluates rules with the `compatibility` role at `food`
  scope.
- Food contribution reports nutrient or predicate contributions without treating
  adequacy as incompatibility.
- Meal progress evaluates rules with the `progress` role at `meal` scope.
- Daily adherence evaluates rules with the `progress` role at `daily` scope.
- Future planning consumes evaluation outputs and ranking inputs but does not alter
  clinical evaluation.

## Semantic model

The initial semantic vocabulary is extensible but intentionally small:

| Concept | Meaning |
| --- | --- |
| `upper-limit` | A value should not exceed an applicable maximum. |
| `lower-target` | Intake should contribute toward a minimum or adequacy target. |
| `recommended-range` | Intake should be evaluated against lower and upper bounds. |
| `restriction` | A policy-owned item or composition is restricted under defined evidence. |
| `interaction` | A policy-owned relationship between a food, nutrient, medication, or condition must be evaluated. |

Roles are orthogonal to rule type:

- `compatibility` answers whether a food or meal fits applicable safety rules;
- `contribution` describes what a food provides;
- `progress` measures meal or daily movement toward applicable goals;
- `planning` is a future consumer-facing ranking signal, not a clinical decision
  role.

A rule may have more than one role. For example, an upper-limit rule may support
compatibility and daily progress, while a protein lower target may support
contribution and meal/daily progress without reducing standalone food
compatibility.

### Valid role and scope combinations

Registrations must declare only semantically valid combinations. The registration
validator rejects invalid combinations before the policy can execute.

| Rule type | Valid roles | Valid scope guidance |
| --- | --- | --- |
| `upper-limit` | `compatibility`, `contribution`, `progress` | Food, meal, or daily as explicitly owned |
| `lower-target` | `contribution`, `progress` | Meal or daily; food only for contribution |
| `recommended-range` | `contribution`, `progress` | Meal or daily; compatibility only when an approved policy explicitly defines safety bounds |
| `restriction` | `compatibility` | Food or meal |
| `interaction` | `compatibility` | Food or meal |

The matrix is a safety guardrail, not a substitute for policy applicability. A
policy may still defer because required user, laboratory, medication, or context
evidence is missing or stale.

## Provenance and precedence

Resolved rules must preserve policy ID and version, semantic descriptor, governing
source and source version, applicability evidence, target/range/predicate value,
freshness and approval evidence, conflict key and precedence decision, supporting
lower-precedence provenance, and deferrals with explanations.

Precedence remains deterministic and is specified separately in ADR 0008. Policy
version alone never determines precedence, and unresolved conflicts defer rather
than guess.

## Historical snapshots and replay

Immutable snapshots must preserve the resolved evaluation rule, not only the
registration ID. A policy-set fingerprint and evaluator version remain required,
but the serialized resolved descriptor is also retained so historical replay does
not depend on mutable registration metadata.

Historical replay must reconstruct the exact rule type, roles, scopes, resolved
target/range/predicate, versions, evidence, provenance, deferrals, evaluation
timestamp, context, and final result.

Canonical Food revisioning remains a separate known limitation. Until Food data is
versioned, historical replay is guaranteed only to the extent that referenced
canonical nutrient data remains unchanged.

## Planning boundary

Planning is a consumer of compatibility, contribution, progress, preferences,
history, availability, and ranking inputs. Planning may rank or explain options,
but it must not modify resolved rules, nutrient calculations, policy decisions, or
clinical provenance.

Future planning signals may include preference, budget, cuisine, variety,
seasonality, leftovers, or ingredient availability. These influence selection and
ranking only.

## Migration and backward compatibility

Migration will be incremental:

1. Add static semantic descriptors to policy registrations.
2. Extend policy outputs and the resolver to produce resolved rules while keeping
   existing target fields available.
3. Adapt the evaluator to consume generic rules for new policies first.
4. Migrate existing policy groups one at a time.
5. Preserve existing API fields and add semantic fields additively.
6. Version evaluator and policy fingerprints whenever score semantics change.
7. Preserve old snapshots using their original evaluator and policy versions.

No existing policy behavior should change merely because the new contract exists.
Behavior changes require an explicit policy or evaluator version change and
regression coverage.

### Numeric shadow-phase exit criteria

The initial `NumericConstraintRule` migration may be promoted only when all of
the following are satisfied:

- existing API response contracts remain backward compatible;
- the legacy and shadow evaluators execute deterministically for the same policy
  set and evaluation context;
- regression tests compare scores, reasons, coverage, deferrals, provenance,
  fingerprints, and snapshot payloads;
- every difference is either an intentional semantic improvement or documented
  as a known limitation;
- provenance, coverage, deferrals, fingerprints, and snapshots remain equivalent
  wherever semantics have not intentionally changed;
- representative policy combinations pass both positive and negative fixtures;
- the shadow evaluator has no unresolved correctness, reproducibility, or safety
  discrepancy.

After promotion, the NumericConstraintRule evaluator becomes primary while the
legacy path remains available temporarily as a rollback mechanism. Policy families
are migrated independently in this order unless implementation evidence requires
otherwise:

1. General Nutrition sodium compatibility;
2. Cardiovascular/Hypertension sodium compatibility;
3. CKD protein contribution and progress;
4. Diabetes carbohydrate contribution and progress;
5. future numeric policies such as potassium and phosphorus.

`PredicateRule` and `InteractionRule` remain deferred until real policy domains,
such as allergies or medication interactions, require them.

## Alternatives considered

### Extend the target model with `constraintType`

A narrower alternative would retain the current target DTO and add a field such
as `ceiling` or `adequacy`. This would solve the immediate protein-versus-safety
problem with less migration effort.

It was not selected as the long-term model because it would continue to assume
that every policy decision is numeric and target-shaped. It cannot represent
predicate restrictions or medication/food interactions without adding more
nullable fields and special cases. It also keeps the evaluator conceptually tied
to targets rather than declared rule semantics.

The target extension remains a valid compatibility representation during
migration, but new policy capabilities should use the discriminated `ResolvedRule`
family.

## Non-goals

This ADR does not introduce new clinical policies, define medical targets, or
implement allergy, medication, AI, planning, or Food revisioning behavior. It
does not replace immutable snapshots or require a new public API before the
resolved-rule contract is implemented.

## Consequences

Positive consequences include a generic evaluator, clearer food-versus-daily
semantics, extensible condition support, explicit provenance, and safer historical
replay.

The migration adds temporary compatibility complexity because target fields and
resolved rules must coexist. That complexity is accepted to avoid changing all
existing policies and snapshots at once. The resolved rule is the long-term
architectural contract; target-specific fields are compatibility representations.
