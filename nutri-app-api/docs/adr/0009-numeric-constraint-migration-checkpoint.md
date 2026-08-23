# ADR 0009: Numeric Constraint Migration Checkpoint

Status: Accepted checkpoint

## Decision

The first implementation slice of ADR 0007 migrates General Nutrition sodium semantics into an additive, shadow-only numeric-rule path.

The sodium registration now declares static semantics:

- numeric constraint family;
- upper-limit kind;
- compatibility, contribution, and progress roles;
- food, meal, and daily scopes;
- sodium measurement key, milligram unit, and compatibility weight.

The resolved rule factory combines those immutable registration semantics with dynamic candidate data: target value, policy identity, conflict key, precedence, and provenance. The generic shadow evaluator consumes the resolved numeric rule and canonical nutrient input. The existing `FoodEvaluationEngine`, target API, snapshots, and production behavior remain primary and unchanged in this slice.

## Implementation findings

### What proved valuable

- Separating registration metadata from resolved policy values avoids embedding sodium behavior in the shadow evaluator.
- A discriminated numeric-rule family is sufficient for the first real policy slice without introducing predicate or interaction infrastructure.
- Generic measurement keys and declared units allow the evaluator to remain independent of condition and nutrient-specific branching.
- A comparison service makes parity observable before promotion to the primary path.

### What remains intentionally deferred

- PredicateRule and InteractionRule remain documentation-level concepts. No current clinical policy requires them.
- The legacy evaluator remains the production source of results until additional numeric families are migrated and parity is reviewed.
- Resolved rules are currently available through internal shadow tooling; broad snapshot and API projection changes are deferred until primary promotion is justified.

## Parity evidence

The sodium shadow evaluator was compared with the legacy engine for sodium-present portions, including above-limit and within-limit cases. The comparison verifies measured value, target value, reason code, and missing-evidence behavior. Repeated evaluation produces identical results.

## Exit criteria for promotion

Promotion of a numeric rule to the primary evaluator requires:

1. API compatibility is verified.
2. Shadow and legacy results are deterministic for representative inputs.
3. Regression tests compare equivalent policy sets.
4. Every difference is classified as parity or an explicitly approved semantic correction.
5. Provenance, coverage, deferrals, fingerprints, and snapshots remain equivalent where behavior is unchanged.
6. A rollback path to the legacy implementation remains available during rollout.

## Checkpoint conclusion

NumericConstraintRule supports the General Nutrition sodium slice without workarounds or premature abstraction. The implementation does not yet justify building PredicateRule or InteractionRule. Further architecture changes should be driven by the next concrete numeric policy migration or a real clinical use case requiring a new rule family.
