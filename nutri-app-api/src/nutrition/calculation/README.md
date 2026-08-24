# Canonical Calculation Kernel

The calculation kernel is a pure, database-independent arithmetic layer for
serving scaling, nutrient contributions, and aggregation. It accepts decimal
values as strings and returns decimal values as strings, avoiding binary
floating-point arithmetic.

The kernel deliberately does not know about foods, recipes, clinical policies,
targets, evaluation, recommendations, persistence, APIs, or replay. Callers
adapt their domain models into the small types exported from `index.ts`.

Missing nutrient values are not treated as zero: `null` and `undefined` rows
are omitted from contributions and reported in `diagnostics.missingNutrientKeys`.
Reported numeric zero remains a real contribution. Units are opaque and are
preserved in outputs; values with different units are never combined.

Aggregation is deterministically sorted by default. The composition API also
supports `aggregationOrder: 'input'` for compatibility adapters that must
preserve an existing first-seen order before applying their own public sorting
contract. This is used by `NutritionCalculator`; it does not change the
kernel's default ordering.

Migration status:

- Food Evaluation endpoint: migrated in Phase 3A.
- Recipe Evaluation: migrated in Phase 3B.
- NutritionCalculator: migrated in Phase 3C.
- Meal Assessment and Daily Adherence: migrated in Phase 3D. The kernel now
  supplies their nutrient measurement scaling and aggregation while policy
  target comparisons, coverage, deferrals, and replay checks remain in the
  policy/projection layer.
- Food Evaluation compatibility bridge: migrated in Phase 3E. The public
  `evaluate()` and contextual evaluation paths now share the Kernel-backed
  implementation. The former private compatibility aggregation path was
  removed after becoming unused.
- Planner integration: completed in Phase 3G. Recipe/template generation,
  daily aggregate evaluation, customization, historical shadow replay, and
  food fallback all delegate nutrient calculation to migrated services. The
  Planner remains orchestration and ranking logic only.
- Recommendation and Consultation consumer audit: completed in Phase 3H.
  Recommendation policies consume food-evaluation snapshots, Meal Assessment,
  and Daily Adherence outputs. Consultation consumes NutritionAnalysisService
  and RecommendationService results, and the AI adapter receives the
  deterministic consultation response. Neither consumer performs serving
  scaling, nutrient aggregation, total calculation, or policy resolution.
- Historical replay aggregation: partially migrated in Phase 3F. Unit-complete
  snapshot version 2 payloads use Kernel aggregation; legacy version 1 or
  mixed-version inputs retain the explicit historical fallback.
- Final legacy cleanup remains gated on making unit-aware snapshot version 2
  the production format and retiring the version 1 replay compatibility path.
- Legacy cleanup audit: completed in Phase 3I. A repository-wide reference audit
  found no unreferenced production calculation utility that can be removed
  without changing compatibility, replay, rollback, or validation behavior.
  No production calculation files were deleted.

Phase 3D observation: the kernel is appropriately limited to deterministic
numeric measurement work. It does not absorb policy semantics such as target
resolution, percentages, deferrals, or historical replay compatibility. Those
responsibilities remain with the existing policy and projection consumers.

Phase 3E observation: compatibility entrypoints can be migrated without
changing their public contracts. This removes arithmetic duplication while
retaining the existing evaluator and policy semantics above the Kernel.

Phase 3F replay compatibility: snapshot version 1 predates a guaranteed unit
on every contribution. Replay therefore preserves its original name-based unit
fallback. The Kernel is used only when every latest snapshot is version 2 and
every contribution has a non-empty unit. Mixed legacy and unit-aware snapshots
stay on the legacy path so incompatible historical semantics are not merged.
Unit inference remains outside the Kernel.

Phase 3G observation: the Planner retains one Decimal conversion when mapping
evaluated gram quantities back to serving quantities for the response. This is
an API quantity adapter, not nutrient calculation, and remains outside the
Kernel by design.

Phase 3H observation: Recommendation and Consultation are intentionally not
direct Kernel dependencies. Their boundary is interpretation and composition
of existing projections, evidence, and replay metadata. Decimal usage in
recommendation policies is limited to comparing or deriving presentation-level
adherence signals from already-resolved projection values; it does not scale
servings, aggregate nutrients, or produce meal/daily totals. The AI layer is
presentation-only and falls back to the deterministic consultation response.

Legacy Calculation Status:

- Intentionally retained: the version 1 historical replay aggregation and its
  `unitForNutrient` compatibility helper. These preserve historical results
  for snapshots that predate guaranteed unit metadata.
- Validation-only: characterization and parity fixtures used to compare
  migrated consumers with their pre-migration behavior.
- Shadow/transitional: version-aware replay selection remains until all
  supported historical payloads can be handled by the unit-aware format.
- Validation-only and retained: `FoodEvaluationValidation`,
  `NumericConstraintRuleShadowEvaluator`, and
  `NumericConstraintRuleComparisonService` are referenced by validation or
  parity tests and the food-evaluation validation script. They are not runtime
  application consumers and should not be deleted while the characterization
  and migration safety net remains active.
- No Recommendation or Consultation calculation utility is pending removal;
  those consumers are orchestration/interpretation layers rather than legacy
  arithmetic implementations.

Phase 3I audit boundary:

- The Kernel is the production source of truth for per-food serving scaling,
  nutrient contribution, and composition aggregation.
- Intentional arithmetic outside the Kernel remains for policy target
  resolution/evaluation, recipe-yield normalization, API quantity adapters,
  validation-only parity tools, and snapshot version 1 replay. These paths do
  not duplicate the Kernel's canonical food contribution/aggregation contract.
- The active `FoodEvaluationService` and planner compatibility entry points are
  public behavior and remain retained; they delegate nutrient arithmetic to
  the Kernel-backed evaluator.
- Final cleanup can remove the v1 replay fallback and its unit helper only
  after version 2 is the supported production snapshot format and historical
  replay coverage confirms that no v1 records remain in scope.
