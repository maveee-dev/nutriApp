# Meal Planning Implementation Roadmap

Status: Implementation plan

This roadmap translates the design in [Meal Planning Architecture](./meal-planning-architecture.md) into small, independently deliverable milestones. It intentionally preserves the current food-based planner until recipe and template coverage is sufficient.

The deterministic nutrition engine, approved nutrition policies, recommendation pipeline, provenance rules, and immutable snapshot behavior remain the source of truth throughout every phase.

## Delivery principles

- Keep the existing Food-based planner operational during migration.
- Introduce one vertical capability at a time.
- Evaluate recipes and meals through the existing deterministic nutrition engine.
- Never duplicate nutrient values in recipes, templates, or planner records.
- Version every approved recipe and template used in historical outputs.
- Prefer additive APIs and backward-compatible response changes.
- Use feature flags or controlled rollout when changing active planner behavior.
- Preserve clear fallback behavior when recipe coverage is incomplete.

## Phase 1: Baseline and compatibility contract

### Objective

Record the current planner behavior and establish the compatibility boundary before introducing recipe-based planning.

### Scope

- Document current food-based planner inputs, outputs, limitations, and fallback behavior.
- Define the initial recipe/template response fields without activating them.
- Identify existing meal logging and snapshot contracts that must remain unchanged.
- Define deterministic fingerprints required for future recipe and plan replay.

### Backend changes

No production behavior changes. Add only documentation, contract tests, or characterization tests if needed to capture current behavior.

### Frontend changes

No user-facing changes. Confirm the existing meal-plan UI continues to consume the current response contract.

### Database/schema changes

None.

### APIs affected

None. Existing food-based meal-plan APIs remain authoritative.

### Migration considerations

This phase establishes the rollback point. No data migration is required.

### Validation/testing strategy

- Characterization tests for current planner ordering and fallback behavior.
- Contract tests for the existing meal-plan API.
- Determinism tests using identical user context and date.

### Expected user-visible outcome

No visible change.

## Phase 2: Recipe/Dish domain model

### Objective

Introduce immutable recipe and dish definitions that reference canonical Food records without duplicating nutrition data.

### Scope

- Recipe identity and immutable Recipe Version.
- Ingredient references to canonical Food and Serving records.
- Ingredient quantity, unit, role, and recipe yield.
- Cuisine, meal-type, source, approval, and visibility metadata.
- Explicit unresolved-ingredient state.

### Backend changes

- Add domain types and services for recipe definitions and versions.
- Add validation for positive quantities, valid servings, recipe yield, and duplicate or invalid ingredients.
- Add authorization boundaries for private and shared recipes.
- Keep recipe persistence separate from Food composition data.

### Frontend changes

No full recipe authoring UI is required. Add only internal API types or a read-only development view if needed for verification.

### Database/schema changes

Likely additions for Recipe, RecipeVersion, and RecipeIngredient references. Recipe ingredients reference Food IDs and quantities; they do not store nutrient values.

### APIs affected

Additive authenticated recipe read endpoints may be introduced for validation. Existing meal and planner APIs are unchanged.

### Migration considerations

- Existing Food records remain unchanged.
- No automatic conversion of individual foods into recipes.
- Recipe records should be introduced through curated seed data or explicit imports.

### Validation/testing strategy

- Version immutability tests.
- Ingredient mapping and quantity validation tests.
- Authorization tests for private recipes.
- Provenance and duplicate-nutrient prevention tests.

### Expected user-visible outcome

No change to daily planning. A small set of recipe records becomes available for internal and future product use.

## Phase 3: Recipe evaluation through the existing engine

### Objective

Evaluate a complete recipe composition using the existing deterministic nutrient and policy pipeline.

### Scope

- Resolve recipe ingredients to canonical nutrient profiles.
- Apply quantities and recipe yield deterministically.
- Produce a shared nutrient profile for the recipe.
- Pass the profile through the existing evaluation engine and active policies.
- Preserve component-level contributions and recipe-level results.

### Backend changes

- Add recipe composition/evaluation orchestration.
- Reuse existing target calculation, policy evaluation, compatibility scoring, recommendation, deferral, and provenance mechanisms.
- Add explicit incomplete-evaluation behavior for unresolved ingredients or unsupported transformations.
- Add recipe evaluation fingerprints and cache keys where appropriate.

### Frontend changes

Add a development or internal recipe evaluation view only if needed. Do not change the primary planner UI yet.

### Database/schema changes

No additional schema is required beyond Phase 1 unless evaluation snapshots need recipe-version references. Any snapshot addition must be backward compatible.

### APIs affected

Add an authenticated recipe evaluation endpoint or an internal service contract. Existing food evaluation endpoints remain unchanged.

### Migration considerations

Recipe evaluations must reference immutable Recipe Versions and canonical Food revisions. Existing food evaluations are unaffected.

### Validation/testing strategy

- Compare recipe nutrient profiles against manually verified fixtures.
- Test portion and yield calculations.
- Test missing and unresolved ingredients.
- Verify policy provenance and deferral behavior.
- Verify deterministic output and evaluation fingerprints.

### Expected user-visible outcome

Future recipe candidates can be evaluated safely, but the active meal planner remains unchanged.

## Phase 4: Meal Template domain

### Objective

Represent realistic meal structures using culturally flexible roles and fixed or parameterized components.

### Scope

- Meal Template and immutable Template Version.
- Meal roles such as Main Dish, Staple, optional Side Dish, Soup, Fruit, and Drink.
- Fixed recipe references and replaceable recipe slots.
- Cuisine, meal type, source, approval, and completeness metadata.
- Candidate limits and cycle-free template validation.

### Backend changes

- Add template composition and validation services.
- Define deterministic slot applicability and candidate constraints.
- Prevent incomplete or unapproved candidates from entering shared plans.
- Keep clinical policy logic outside template definitions.

### Frontend changes

No complete authoring UI yet. Add read-only template inspection for internal validation if useful.

### Database/schema changes

Likely additions for MealTemplate, TemplateVersion, and TemplateSlot records. Slots reference recipes or approved canonical components rather than nutrient data.

### APIs affected

Additive read endpoints for approved templates. Existing planner and meal APIs remain unchanged.

### Migration considerations

Start with a small curated set of templates and recipes. Do not migrate all existing food candidates automatically.

### Validation/testing strategy

- Slot and role validation.
- Fixed, parameterized, and hybrid template tests.
- Cuisine and meal-type filtering tests.
- Candidate bound and cycle-prevention tests.
- Approval and visibility tests.

### Expected user-visible outcome

No default planner change. The backend can represent complete culturally meaningful meal structures.

## Phase 5: Recipe/template planner in shadow mode

### Objective

Run recipe/template planning alongside the current planner to compare results without changing the user experience.

### Scope

- Generate candidate Meals from approved Recipes and Meal Templates.
- Evaluate complete meals and daily aggregates.
- Produce deterministic ranking and provenance.
- Compare recipe-based results with current food-based results internally.

### Backend changes

- Add recipe/template candidate generation.
- Add bounded candidate search and deterministic tie-breakers.
- Add plan-generation fingerprints.
- Preserve the existing food planner as the active fallback.

### Frontend changes

No default UI change. Internal diagnostics may expose shadow results to development or test environments only.

### Database/schema changes

Add optional plan-generation metadata or internal comparison storage only if required. Do not alter existing meal logs.

### APIs affected

Optionally add an internal or versioned preview endpoint. Existing daily meal-plan responses remain backward compatible.

### Migration considerations

No user data migration. Shadow results must never be persisted as historical user recommendations unless explicitly accepted.

### Validation/testing strategy

- Compare deterministic outputs across repeated runs.
- Confirm no alcohol, condiments, beverages, or isolated ingredients become complete meals.
- Verify CKD, diabetes, cardiovascular, and general policy behavior.
- Load-test bounded candidate evaluation.
- Measure database query count and evaluation latency.

### Expected user-visible outcome

No change, while the team gains evidence that recipe-based planning is safe and useful.

## Phase 6: Shadow validation and planner activation readiness

### Objective

Complete the engineering work required to decide whether the recipe/template planner is safe to activate. This phase remains internal and does not change production planner behavior.

### Scope

- Optimize and compare complete Daily Meal Plans rather than ranking each meal independently.
- Profile candidate counts, database reads, evaluation latency, memory use, and worst-case bounded searches.
- Define and validate replay payloads containing template versions, recipe versions, component quantities, canonical-food provenance, policy-set fingerprints, and evaluation fingerprints.
- Make deferred-policy handling explicit so missing, stale, conflicting, or unsupported evidence never becomes implicit clinical approval.
- Add a deterministic clinical validation workstream using representative profile and evidence fixtures across supported and unsupported policy combinations.
- Specify portion optimization as a future deterministic enhancement: quantities may later be adjusted against remaining daily targets through the existing evaluation engine, but portion optimization is not activated in this phase.

### Backend changes

- Add internal daily aggregate comparison/optimization tooling where required.
- Add repeatable profiling fixtures and candidate/evaluation timing measurements.
- Add internal replay validation against captured provenance and fingerprints.
- Classify policy deferrals for migration decisions without adding clinical logic to templates or recipes.
- Add fixture-driven planner validation for healthy adults, Diabetes, Hypertension, CKD Stage 3, CKD Stage 5/Dialysis, Diabetes + CKD, CKD + Hypertension, Hyperlipidemia, and Anemia + CKD.

### Frontend changes

None. Shadow validation and profiling remain internal.

### Database/schema changes

None required for the validation path. Do not persist shadow output as user history. Any future historical plan record must capture the complete replay identity before activation.

### APIs affected

None. Existing production planner and recommendation contracts remain unchanged.

### Migration considerations

The Food-based planner remains the only production planner. Activation is blocked until daily aggregate behavior, performance budgets, replay behavior, and deferral semantics satisfy the acceptance criteria documented in the architecture proposal.

### Validation/testing strategy

- Repeated-run determinism tests for complete daily plans.
- Aggregate nutrient and policy-validation tests across all meal slots.
- Performance tests with representative and worst-case template/recipe coverage.
- Query-count and evaluation-latency budgets.
- Replay tests after changing current recipe, Food, or policy state.
- Explicit tests proving deferred evidence is not treated as approval.
- Clinical fixture tests for realistic composition, daily aggregate nutrition, policy adherence, reproducibility, deferrals, recipe/template selection, and exclusion of alcohol, condiments, and isolated ingredients as complete meals.
- Comparison tests covering missing candidates, fallback candidates, recipe candidates, score changes, and provenance differences.

### Expected user-visible outcome

No visible change. The result is a measurable activation decision and a documented rollback-ready migration gate.

### Phase 6.2 profiling report contract

The internal `ShadowPlanningProfilerService` reports observations without changing planner output. Its result includes total execution time, stage timings for data loading, template selection, slot resolution, recipe evaluation, ranking, and daily aggregate evaluation; evaluation counters; repository-level lookup estimates; candidate bounds; and optimization opportunities.

Metric meanings are explicit:

- `recipesEvaluated`: approved recipe candidates included in evaluated meal compositions.
- `recipeEvaluations`: calls to the deterministic recipe composition evaluator, including the daily aggregate evaluation.
- `policyEvaluations`: target/policy evaluation contexts requested by those evaluations.
- `nutritionAggregations`: aggregate composition calculations requested by the evaluation pipeline.
- `candidateMealsGenerated`: bounded compositions submitted for evaluation.
- `candidateMealsDiscarded`: compositions rejected because canonical resolution or evaluation failed.
- lookup counters: repository/service call boundaries, not an unsupported claim of individual SQL statements.

An illustrative internal result shape is:

```json
{
  "apiVersion": "internal-shadow-profile-v1",
  "metrics": {
    "totalExecutionMs": 0,
    "stages": {
      "databaseLoadingMs": 0,
      "templateSelectionMs": 0,
      "slotResolutionMs": 0,
      "recipeEvaluationMs": 0,
      "rankingMs": 0,
      "dailyAggregateEvaluationMs": 0
    },
    "templatesEvaluated": 0,
    "recipesEvaluated": 0,
    "recipeEvaluations": 0,
    "recipeComponentsEvaluated": 0,
    "policyEvaluations": 0,
    "nutritionAggregations": 0,
    "candidateMealsGenerated": 0,
    "candidateMealsDiscarded": 0,
    "databaseQueryCounts": {},
    "maximumCandidatesPerSlot": 0,
    "maximumSlotCombinations": 0,
    "combinationLimitHits": 0
  }
}
```

No numeric optimization target is assumed before representative profiling. Phase 6 must establish p95 complete-day latency, maximum evaluation count, bounded repository-call counts, and candidate/memory limits as regression thresholds. Optimization is a separate follow-up and must not alter ranking or clinical behavior.

### Phase 6.4 Historical replay validation

#### Objective

Prove that a completed shadow plan can be replayed internally from its historical inputs without selecting newer live
versions or silently recomputing with current policy state. This phase does not activate the shadow planner and does not
change production APIs, recommendation behavior, the schema, or the frontend.

#### Replay snapshot contents

The internal historical snapshot captures:

- `MealTemplateVersion` identity and template provenance for every selected meal;
- `RecipeVersion` identities and the complete resolved component composition;
- canonical `Food` and `Serving` references, quantities, units, and canonical nutrient fingerprints;
- target calculations and target provenance used by the original evaluation;
- policy-set fingerprint, evaluator/recipe evaluation fingerprint, deferred-policy identifiers, and evaluation timestamp;
- a snapshot fingerprint covering the captured replay inputs.

Replay evaluates the captured composition through the existing deterministic recipe evaluation service. It supplies the
captured target calculation and policy-set fingerprint so replay is explicitly distinct from a fresh recommendation
recomputation. Empty plans, deferred-policy results, and unsupported-condition scenarios are valid replay cases and must
remain explicit rather than being treated as approval.

#### Historical guarantee and current limitation

Immutable recipe and template versions prevent newer versions from changing a captured plan. Canonical Food records are
currently mutable and are not yet revisioned. Therefore exact replay is guaranteed only while the current canonical food
and serving fingerprints match the captured fingerprints. A mismatch makes exact recomputation unavailable and must be
reported; the system must not silently substitute current nutrient data. Food revisioning or immutable nutrient-profile
storage remains a future decision and is intentionally outside this phase.

#### Validation strategy

Replay tests cover repeated replay of the same snapshot, introduction of newer recipe/template versions, deferred
policies, empty plans, unsupported-condition contexts, and canonical-food mutation detection. Matching inputs produce
identical evaluation and snapshot fingerprints, policy provenance, target provenance, and deferred-policy identifiers.

### Phase 6.5 Pre-activation engineering review

Before Phase 7, perform a documentation-only independent review of the complete shadow planner. The review must issue a
clear go/no-go decision and assess architecture, module boundaries, maintainability, shadow/production parity,
deterministic ranking, daily aggregate evaluation, policy correctness, clinical safety, deferred-policy handling,
performance budgets, query patterns, caching opportunities, candidate explosion, data consistency, provenance,
historical replay, authorization, private recipe isolation, rollback, remaining technical debt, and future extensibility.

Future preferences, allergies, budgets, groceries, leftovers, and AI-assisted recipe import must remain ranking/input
concerns and must not alter clinical evaluation. Any issue affecting correctness, determinism, clinical safety,
reproducibility, or maintainability is an activation blocker unless the review documents a tested mitigation. Phase 7
must not start until all gates are reviewed and the recommendation is approved.

#### Phase 6.5 review outcome

The initial review recommendation is **No-Go** for Phase 7. The shadow planner is suitable for continued internal testing,
but activation is blocked by three concrete gaps: mutable canonical Food/Serving data prevents reconstruction of the exact
historical nutrient state after a fingerprint changes; representative p95 latency, query, memory, and candidate-count
budgets have not yet been accepted as regression thresholds; and production-sized recipe/template coverage still needs
validation across supported meal types and contexts. These findings do not alter production behavior and do not require a
new planner architecture. The food-based planner remains active until the gates are resolved or explicitly approved as
safe limitations.

## Phase 7: Active planner migration to recipes and templates

### Implementation status

Implemented behind the existing daily meal-plan endpoint. Valid recipe/template selections are now the active planner
result, with complete meal metadata and daily aggregate evaluation. The legacy food planner remains an explicit
compatibility fallback when no valid complete shadow meal is available, preserving rollback and existing clients.

The response is additive: existing flattened `items` remain available, while `meals`, component provenance, template and
recipe version identifiers, evaluation fingerprints, and planner identity are included for new clients.

### Objective

Make complete recipe/template meals the default planner output while preserving safe fallback behavior.

### Scope

- Prefer approved complete meals for breakfast, lunch, dinner, and snacks.
- Retain individual-food fallback only when no suitable complete candidate exists.
- Clearly label fallback results.
- Preserve existing API compatibility where possible.

### Backend changes

- Switch planner orchestration from individual-food ranking to recipe/template ranking.
- Keep existing evaluation and recommendation services unchanged.
- Add meal-level and daily-plan evaluation output.
- Include recipe/template provenance in new response fields.

### Frontend changes

- Render dish names and meal components.
- Preserve existing loading, error, retry, and logging flows.
- Allow users to inspect components without requiring a new authoring experience.

### Database/schema changes

Optional recipe/template references in new plan records or snapshots. Existing meal logs remain valid.

### APIs affected

Extend responses additively with recipe, template, component, and version metadata. Existing food-based clients must continue to function.

### Migration considerations

- Use a feature flag or controlled rollout.
- Keep rollback to the food planner available.
- Do not rewrite historical food-based plans.

### Validation/testing strategy

- End-to-end planner tests.
- Backward-compatible API contract tests.
- Clinical regression tests across active policy groups.
- Historical reproducibility tests.
- Rollback and fallback tests.

### Expected user-visible outcome

Users see realistic dishes and complete meals instead of isolated food records.

## Phase 8: Meal customization and deterministic re-evaluation

### Objective

Allow users to modify suggested meals without changing the underlying recipe or template versions.

### Scope

- Remove optional components.
- Replace components or slots.
- Change portions.
- Re-evaluate components, the complete Meal, and the Daily Meal Plan.
- Accept or log the final customized Meal.

### Backend changes

- Add meal customization orchestration.
- Preserve planned versus accepted versus logged lifecycle state.
- Create immutable customized meal snapshots or versions.
- Reuse existing meal logging and evaluation services.

### Frontend changes

- Component review and replacement controls.
- Portion editing.
- Overall and component compatibility explanations.
- Clear distinction between suggested and logged meals.

### Database/schema changes

May require immutable Meal and MealComponent records or snapshot extensions. Existing MealItem evaluation snapshots remain compatible.

### APIs affected

Additive customization and preview endpoints; existing meal creation remains supported.

### Migration considerations

Customized meals must reference the original plan and recipe versions. Historical snapshots must not be rewritten.

### Validation/testing strategy

- Deterministic re-evaluation after each change.
- Portion and component replacement tests.
- Authorization and ownership tests.
- Plan-to-log reproducibility tests.

### Expected user-visible outcome

Users can personalize a suggested dish or meal and immediately see the evidence-backed impact.

## Phase 9: Variety and history-aware ranking

### Objective

Reduce repetitive recommendations while preserving deterministic ranking and clinical safety.

### Scope

- Recent recommendation history.
- Accepted and logged meal history.
- Repetition penalties for recipes, cuisines, main dishes, and staples.
- Stable deterministic rotation and tie-breaking.

### Backend changes

- Add a frozen history input to planner execution.
- Add deterministic ranking factors and generation fingerprints.
- Keep history as a ranking input, never a nutrient or clinical-policy input.

### Frontend changes

No major UI change. Optionally explain that recommendations vary based on recent meals.

### Database/schema changes

Reuse existing meal and recommendation history where possible. Add indexes or projection support only after measured query needs.

### APIs affected

Existing planner responses may gain ranking metadata and reproducibility fields additively.

### Migration considerations

Define the history window and behavior when historical coverage is incomplete. Historical plans must retain their original ranking inputs.

### Validation/testing strategy

- Same inputs produce identical results.
- Recent meals are penalized deterministically.
- Clinical exclusions always outrank variety preferences.
- Historical replay does not use current history.

### Expected user-visible outcome

Users receive more varied meals without randomness or loss of clinical explainability.

## Phase 10: User-created recipes

### Objective

Allow users to create and maintain personal recipes using canonical Food references.

### Scope

- Recipe authoring and versioning.
- Ingredient search and mapping.
- Draft, approved, archived, and rejected states.
- Private ownership and optional sharing.

### Backend changes

- Add recipe authoring validation and approval workflows.
- Preserve unresolved ingredients and evaluation limitations.
- Prevent private recipe leakage.

### Frontend changes

- Recipe editor.
- Ingredient search and portion entry.
- Review and approval flow.
- Recipe history and version display.

### Database/schema changes

Use the Recipe and RecipeVersion model from Phase 1; add moderation or sharing metadata only where required.

### APIs affected

Authenticated recipe CRUD and evaluation endpoints.

### Migration considerations

Personal recipes must remain private by default. Publishing creates a distinct approval and visibility state.

### Validation/testing strategy

- Authorization and ownership tests.
- Version immutability tests.
- Unresolved ingredient tests.
- Evaluation provenance and historical replay tests.

### Expected user-visible outcome

Users can plan with their own recipes without leaving the deterministic nutrition pipeline.

## Phase 11: AI-assisted recipe import and ingredient mapping

### Objective

Use AI to accelerate recipe discovery and extraction without allowing AI to become a nutrition or clinical authority.

### Scope

- Import from approved recipe sources.
- Extract ingredients and quantities.
- Map ingredients to canonical Foods.
- Present unresolved or ambiguous mappings for user review.

### Backend changes

- Add localized import orchestration behind the existing AI/provider boundaries.
- Store raw source, extracted data, mapping decisions, approval state, and recipe version.
- Reject or defer unsupported nutrient assumptions.

### Frontend changes

- Import flow with source review.
- Ingredient mapping confirmation.
- Unresolved ingredient warnings.
- Approval before use in planning.

### Database/schema changes

Reuse recipe provenance and approval fields. Add raw extraction storage only if required for auditability.

### APIs affected

Additive recipe import and mapping endpoints.

### Migration considerations

AI-imported recipes must default to draft and must not enter shared planning until approved.

### Validation/testing strategy

- Provider failure and deterministic fallback tests.
- No invented nutrient value tests.
- Mapping and provenance tests.
- Approval and audit tests.

### Expected user-visible outcome

Users can import dishes faster while retaining control over ingredient mappings and nutrition accuracy.

## Phase 12: Grocery lists, pantry, leftovers, and budget

### Objective

Extend accepted Daily Meal Plans into practical shopping and leftover workflows.

### Scope

- Grocery list generation from approved recipe components.
- Pantry availability.
- Leftover quantities and reuse.
- Budget-aware substitutions.

### Backend changes

- Aggregate recipe ingredients without duplicating nutrition logic.
- Keep cost, pantry, and availability as ranking or planning inputs.
- Preserve recipe and meal provenance.

### Frontend changes

- Grocery list and pantry views.
- Leftover prompts.
- Budget and substitution controls.

### Database/schema changes

Introduce only the storage required for pantry, grocery, cost, and leftover state after the earlier recipe and meal contracts are stable.

### APIs affected

Additive grocery, pantry, and substitution APIs.

### Migration considerations

Generated grocery data must remain linked to the source Daily Meal Plan and Recipe Versions. Cost or availability changes must not rewrite historical nutrition evaluations.

### Validation/testing strategy

- Ingredient aggregation tests.
- Portion and leftover calculations.
- Deterministic budget ranking tests.
- Historical plan and grocery reproducibility tests.

### Expected user-visible outcome

Users can turn accepted meal plans into actionable shopping and leftover workflows.

## Recommended implementation order

The proposed sequence is intentionally different from a direct feature-by-feature rollout:

1. Baseline and compatibility contract
2. Recipe/Dish domain model
3. Recipe evaluation
4. Meal Template domain
5. Recipe/template planner in shadow mode
6. Shadow validation and planner activation readiness
7. Active planner migration
8. Meal customization
9. Variety and history-aware ranking
10. User-created recipes
11. AI-assisted recipe import
12. Grocery, pantry, leftovers, and budget capabilities

Shadow mode is important. It allows recipe coverage, clinical behavior, latency, candidate quality, and historical provenance to be verified before replacing the existing food-based planner.

## Final roadmap outcome

After these phases, NutriApp will recommend culturally meaningful, customizable Meals assembled from canonical Foods, organize them into reproducible Daily Meal Plans, and extend them into recipes, groceries, pantry, leftovers, and AI-assisted workflows without changing the deterministic nutrition engine or clinical policy ownership.
