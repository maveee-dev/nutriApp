# Meal Planning Architecture Proposal

Status: Design proposal

This document proposes a domain model for realistic, culturally diverse meal planning while preserving NutriApp's deterministic nutrition, policy, recommendation, provenance, and snapshot architecture.

No implementation, schema, or policy behavior is defined by this document. It is intended to guide future architectural discussion.

## Problem statement

The current planner ranks individual canonical foods and assigns the highest-scoring items to meal slots. This is technically compatible with the evaluation engine, but it is not a realistic model of how people plan or describe meals.

An individual item can have a favorable compatibility score while being unsuitable as a complete breakfast, lunch, or dinner. The planner may therefore recommend beverages, alcohol, condiments, sauces, ingredients, or restaurant side dishes as if they were meals. Examples include acerola juice, agave, beer, soy sauce, spices, or restaurant coleslaw.

The underlying issue is the planning abstraction, not the deterministic evaluation or nutrition policies. People generally think in terms of dishes such as Chicken Adobo, Tinola, Sinigang, and Pinakbet rather than a list of isolated ingredients.

## Design goals

The proposed architecture must:

- Preserve the existing `Food` table as the single canonical source of food composition and nutrient values.
- Evaluate foods, recipes, and assembled meals deterministically.
- Preserve complete policy, evaluator, source, and ingredient provenance.
- Make historical plans reproducible through immutable versions and snapshots.
- Never duplicate nutrient values in recipes, templates, or planner records.
- Support Filipino, Japanese, Mediterranean, and other cuisines without separate nutrition databases.
- Support culturally realistic dishes without assuming that every meal revolves around meat.
- Allow future preferences, allergies, budgets, substitutions, leftovers, and grocery planning.
- Keep clinical evaluation and policy decisions in the existing deterministic pipeline.

## Proposed domain model

```text
Food (Canonical Nutrition)
        │
        ▼
Recipe / Dish
        │
        ▼
Meal Template
        │
        ▼
Meal Planner
        │
        ▼
Meal Recommendation
```

### Refined runtime domain model

The core runtime distinction is:

```text
Food (Canonical Nutrition)
        |
        v
Recipe / Dish
        |
        v
Meal
        |
        v
Daily Meal Plan
```

Meal Templates are planning structures used to produce Meals; they are not a replacement for the Meal domain object:

```text
Meal Template + Recipe/Dish candidates
                |
                v
             Meal
                |
                v
       Daily Meal Plan
```

`Food` remains the single canonical nutrition source. `Recipe / Dish` is a composition of canonical foods with quantities. `Meal` is what the user actually eats, such as Chicken Adobo, rice, and water. `Daily Meal Plan` is the date-specific collection of breakfast, lunch, dinner, and snacks.

### Food: canonical nutrition

`Food` remains the authoritative source for nutrient composition, serving definitions, source identifiers, and food-level provenance.

Foods may be ingredients, beverages, prepared foods, or other canonical entries. Their existence in the database does not by itself make them suitable as a complete meal.

The Food model remains independent of clinical policy interpretation. Nutrition policies consume evaluated nutrient contributions and targets; they do not become properties of individual food records.

### Recipe / Dish: culturally meaningful composition

A Recipe or Dish represents a recognizable preparation and references canonical foods with quantities.

For example, a recipe for Chicken Adobo may reference chicken, garlic, vinegar, soy sauce, and oil. The recipe stores the composition and quantities, but never stores duplicated nutrient values.

Nutrition is calculated from the referenced canonical foods, servings, quantities, and recipe yield. If a preparation effect cannot be represented deterministically, the recipe should retain an explicit limitation or remain unevaluated rather than inventing nutrient behavior.

Recipes should be versioned. Once a version has been used in a recommendation or historical snapshot, changing its ingredients or quantities creates a new version instead of rewriting the old one.

Recipes should be immutable after approval. Editing ingredients, preparation quantities, portions, or yield creates a new recipe version. Historical meal logs, recommendations, consultations, evaluations, and snapshots continue to reference the original version and remain reproducible.

Recipes may represent:

- Chicken Adobo
- Tinola
- Sinigang
- Tortang Talong
- Ginisang Gulay
- Pinakbet
- Fish dishes
- Tofu dishes
- Other culturally meaningful preparations

A Main Dish may be meat-based, fish-based, tofu-based, vegetable-based, egg-based, or another culturally valid preparation. The architecture must not encode a requirement that a meal contain meat.

### Meal: what the user actually eats

A Meal is an assembled, user-facing eating event. It may be generated from a template, customized by the user, or logged manually.

For example, a Meal may consist of Chicken Adobo, rice, and water. The Meal references the selected recipe versions or canonical components and records the quantities actually chosen. Users can remove a side, replace a drink, or change a portion without modifying the approved recipe itself.

After customization, the complete Meal is re-evaluated deterministically while preserving the selected recipe versions, component quantities, and provenance.

A Meal should also distinguish its lifecycle state, such as planned, accepted, modified, logged, or discarded. A planned Meal becoming a logged Meal must preserve the original plan reference while recording the actual components and portions consumed.

### Meal Template: meal structure and roles

A Meal Template represents the structure of a meal occasion. It may contain fixed recipes, replaceable slots, or both.

Templates should represent culturally meaningful meal roles rather than assuming Western macro-nutrient groupings. Preferred roles include:

- Main Dish
- Staple
- Side Dish (optional)
- Soup (optional)
- Drink (optional)
- Fruit (optional)

The template should not require every meal to contain separate `Protein`, `Carbohydrate`, and `Vegetable` groups. Those concepts may be useful as descriptive metadata for evaluation or filtering, but they should not define the user's meal experience.

A template may be fixed, parameterized, or hybrid:

- A fixed template may recommend a specific Chicken Adobo dish with a staple.
- A parameterized template may define a Main Dish slot and a Side Dish slot.
- A hybrid template may fix a soup and staple while allowing the Main Dish to vary.

Slots select recipes or dishes where possible. Canonical foods remain available for simple components, snacks, or fallback cases, but the planner's primary output is a complete meal composition.

### Daily Meal Plan: a day-specific collection

A Daily Meal Plan is the collection of Meals generated or selected for a specific date. It may contain breakfast, lunch, dinner, and one or more snacks, subject to available templates and the user's context.

The Daily Meal Plan preserves the selected Meal and Recipe versions, meal slots, target context, evaluation results, recommendation evidence, and plan-generation provenance. It is a dated planning result, not a mutable copy of the recipe database.

### Meal Planner: deterministic composition and ranking

The Meal Planner selects and assembles recipes and templates for a user's meal slots. It consumes:

- Active nutrition targets
- Existing policy outputs and deferrals
- User evidence and applicable conditions
- Preferences and restrictions when those models exist
- Meal history and recommendation history
- Available recipe and template metadata

The planner is responsible for composition and ranking. It must not calculate nutrients, reinterpret clinical policies, or create new targets.

### Meal Recommendation: user-facing result

A Meal Recommendation is a deterministic result containing the selected template, recipe versions, food components, quantities, evaluation results, and provenance.

It should recommend complete meals rather than isolated foods. Individual components may still be displayed so users can review, replace, remove, or adjust them.

## Evaluation pipeline

Foods, recipes, and complete meals should be evaluated through the same deterministic evaluation engine using a shared nutrient profile.

```text
Canonical Food records
        ↓
Recipe ingredient quantities and yield
        ↓
Assembled meal nutrient profile
        ↓
Existing deterministic evaluation engine
        ↓
Active nutrition policies and targets
        ↓
Compatibility, recommendations, deferrals, and provenance
```

The architecture should avoid separate nutrient calculators for foods, recipes, and meals. The composition layer creates the nutrient profile; the existing evaluation engine remains responsible for evaluating it.

Each component may have its own compatibility score, while the assembled meal also receives an overall compatibility score. The overall score must not be a naive replacement for policy evaluation; it must preserve all applicable contributions, reasons, deferrals, and policy provenance.

## Customization and substitutions

Users should eventually be able to:

- Replace a Main Dish
- Remove an optional Side Dish
- Change a Staple
- Replace or remove a Drink
- Adjust portions
- Substitute a recipe or component

After every change, the application should immediately re-evaluate the assembled meal through the same deterministic pipeline.

The UI may show both component-level and meal-level feedback. For example, a dish may be compatible by itself while the assembled meal exceeds a sodium target because of the selected sauce and staple.

After every customization, the application should re-evaluate the complete Meal deterministically, display both the overall Meal compatibility and each component's compatibility, and preserve all recipe versions, canonical Food references, quantities, policy provenance, and evaluation context. Customization changes the Meal instance; it does not modify the underlying approved Recipe.

## Recommendation explanations

Future meal recommendations should explain why a meal was selected using existing deterministic policy outputs and evidence. Examples include:

- Fits today's sodium allowance.
- Appropriate for the applicable CKD targets.
- Supports the user's individualized diabetes carbohydrate goal.
- Good source of iron.

These explanations must come from deterministic policy evaluation, target calculations, contributions, deferrals, and provenance. AI may later make explanations more conversational, but it must not independently reason about clinical suitability or replace the policy engine.

## Recipe sources and approval

Recipes may come from:

- Official recipes
- User-created recipes
- Community recipes
- AI-imported recipes

Source affects recommendation priority, moderation, approval requirements, and trust presentation. It must not affect nutrient calculation: every evaluated ingredient still maps to the canonical Food table.

AI-imported recipes remain drafts until ingredients are mapped, quantities are reviewed, unresolved items are disclosed, and the user or an authorized reviewer approves the recipe version.

## Recommendation strategy layer

A conceptual ranking layer may influence meal selection without changing deterministic clinical evaluation. Possible ranking factors include:

- Clinical safety
- User preferences
- Budget
- Cuisine
- Variety and history
- Seasonality
- Ingredient availability
- Leftovers

These factors influence candidate eligibility or ranking only. They must never modify nutrient calculations, alter clinical policy decisions, invent targets, or override deterministic deferrals. Clinical safety remains a hard evaluation boundary; preference and convenience factors cannot make an unsafe meal acceptable.

## Scalability and edge-case safeguards

The following safeguards should be treated as design requirements before implementation:

### Canonical data revision identity

Recipe versioning alone is insufficient if a referenced Food record can later change. Historical provenance must identify the Food data source, source release or version, and a canonical food revision or nutrient fingerprint used in the evaluation.

If canonical food composition is corrected, new evaluations may use the corrected data, but historical meal logs, recommendations, and snapshots must continue to reference the original food revision or an immutable captured nutrient profile.

### Phase 2 reproducibility assessment

The current `Recipe → RecipeVersion → RecipeComponent` relationship is necessary but not sufficient for exact historical replay by itself. `RecipeVersion` is immutable, but the referenced canonical `Food`, `Serving`, and nutrient rows currently have mutable database identities rather than first-class revision records.

Until canonical food revisioning exists, every recipe evaluation and historical snapshot must capture a deterministic canonical-data fingerprint or immutable nutrient profile containing the Food and Serving identifiers, source/source identifier, nutrient identifiers, units, amounts, and relevant data release metadata. A matching fingerprint proves that the current canonical data is the same as the data used previously; a mismatch must cause replay to use the captured profile or explicitly report that exact recomputation is unavailable.

RecipeVersion references alone must therefore not be described as sufficient historical provenance. Canonical Food revisioning or immutable nutrient-profile capture remains a required future reproducibility decision before historical recipe replay is treated as complete.

### Recipe completeness and preparation limits

A recipe must distinguish fully mapped ingredients from unresolved ingredients. A recipe with unresolved ingredients should not be treated as fully evaluated or eligible for clinical meal recommendations.

Recipe evaluation also requires explicit rules for serving yield, edible portions, unit conversion, trimming, water absorption, and cooking transformations. Unsupported transformations must produce a declared limitation or deferral rather than an estimated nutrient value.

Nested recipes should be bounded and cycle-free. The initial implementation should prefer recipes referencing canonical Foods directly unless a concrete need for nested recipes is demonstrated.

### Meal-level and day-level evaluation

Each Meal should be evaluated as an assembled unit. A Daily Meal Plan must also support aggregate evaluation because individually acceptable meals can collectively exceed a daily target.

Daily aggregation must use the same policy outputs and nutrient contributions as meal evaluation. It must not introduce a second scoring model or silently reinterpret meal-level decisions.

### Deterministic ranking contract

Ranking must define a total ordering. Every candidate comparison should have explicit tie-breakers, such as compatibility score, policy coverage, source priority, history penalty, template version, and stable identifier.

The ranking input must be frozen for a planning request, including the user's effective date, evidence context, history window, availability data, and policy-set fingerprint. Wall-clock time, database row order, and unseeded randomness must not affect output.

### Candidate-search bounds

Parameterized templates can create a combinatorial candidate explosion. Planner execution should use bounded candidate pools, staged hard filtering, and explicit limits per slot, cuisine, and template family.

Clinical exclusions and unresolved-evidence checks should occur before expensive full-meal evaluation. Candidate generation must remain bounded and observable so a large recipe catalog cannot cause an unbounded request.

### Evaluation caching

Recipe and Meal evaluation may be cached, but cache identity must include every input that can change the result:

- Recipe or template version
- Canonical food revision or nutrient fingerprint
- Component quantities and yield
- Evaluation version
- Policy-set fingerprint
- User evidence and effective-date fingerprint

Cached results must be invalidated or naturally bypassed when any of these inputs changes. Caching is an optimization and must never replace immutable provenance.

### History and personalization boundaries

History, preferences, budget, seasonality, and availability should be normalized into deterministic ranking inputs. They must not be read repeatedly during candidate comparison in a way that changes ordering or produces inconsistent results.

Hard exclusions, such as approved allergies or unsafe unresolved ingredients, must be applied before soft ranking preferences. A preference must never cause a clinically unsuitable candidate to outrank a safe candidate.

### Source, approval, and access control

Recipe source and approval state must be evaluated before a recipe becomes eligible for shared recommendations. User-owned drafts, community recipes, official recipes, and AI-imported drafts may have different visibility and moderation rules.

Authorization must remain separate from nutrition evaluation. A user may evaluate a private recipe they own, but private recipe data must not leak into another user's plan or historical replay.

### Plan generation and replay identity

A Daily Meal Plan should record a generation fingerprint containing the effective date, user context fingerprint, policy-set fingerprint, recipe/template versions, ranking configuration, and history window. Replaying a historical plan must use those recorded inputs rather than silently recomputing with current ranking rules.

## Future extensibility

The model supports future capabilities without changing the canonical nutrition source:

- User-created recipes
- AI-assisted recipe import mapped to canonical foods
- Budget-aware substitutions
- Allergy exclusions
- Food preferences
- Cuisine filtering
- Variety and history-aware ranking
- Grocery planning
- Leftover reuse
- Preparation-time constraints
- Meal timing

These capabilities should influence candidate eligibility and planner ranking. They must not alter deterministic clinical evaluation, calculate nutrient values independently, or override approved policy decisions.

For example:

- An allergy is a hard candidate exclusion once supported by approved user evidence.
- A cuisine preference is a ranking preference.
- A budget is a constraint or ranking input based on explicit cost metadata.
- A CKD policy remains the authority for CKD-related nutrient decisions.

## Provenance and reproducibility

Every evaluated recipe and meal recommendation should preserve:

- Recipe and recipe-version identifiers
- Meal-template and template-version identifiers
- Canonical food IDs and serving IDs
- Ingredient quantities and yields
- Source and approval status
- Evaluation version
- Policy-set fingerprint
- Target and policy provenance
- Evidence context used for applicability
- Recommendation timestamp

Historical plans must be reproducible from immutable recipe versions, canonical food references, and immutable evaluation snapshots. Future recipe edits, policy changes, or ranking changes must not silently rewrite historical results.

## User-created and AI-assisted recipes

User-created and AI-assisted recipes should enter the same workflow as curated recipes:

1. Extract or enter ingredients.
2. Map ingredients to canonical Food records.
3. Mark unresolved ingredients explicitly.
4. Calculate nutrition only for resolved canonical ingredients.
5. Let the user review quantities and mappings.
6. Require approval before the recipe is used as an authoritative planning candidate.
7. Store complete provenance and an immutable recipe version.

AI may assist with recipe discovery, OCR, ingredient extraction, mapping, and explanations. It must not invent nutrient values or clinical decisions.

## Benefits

- Produces realistic dish-level recommendations.
- Preserves the existing canonical food database.
- Reuses the current deterministic evaluation and policy pipeline.
- Supports cultural diversity through recipes and metadata rather than separate nutrition systems.
- Enables component replacement and immediate re-evaluation.
- Provides a natural foundation for grocery lists, leftovers, and meal history.
- Makes historical recommendations auditable and reproducible.

## Trade-offs

- Recipe composition requires more curated data than individual food ranking.
- Ingredient quantities, yields, and preparation assumptions must be explicit.
- Recipe versioning increases data-management complexity.
- Coverage may initially be limited for less common cuisines.
- A template system can become overly generic if slots are not grounded in real dishes.
- Deterministic variety requires maintaining and evaluating history metadata.
- Some cooking transformations may require explicit evidence before they can be modeled safely.

## Open questions

- Should Recipe and Dish be separate concepts, or should Dish be the user-facing name for Recipe?
- Should recipes support nested recipes, or should initial versions reference canonical Foods only?
- How should cooking yield, water absorption, trimming, and edible portions be represented?
- Which recipe approval states are required for personal, shared, expert-reviewed, and imported recipes?
- Should meal templates be globally curated, user-specific, or both?
- What minimum completeness rules should apply before a recipe can be recommended as a Main Dish?
- How should recipe cost and preparation time be sourced and versioned?
- What historical window should influence variety ranking?
- How should unresolved ingredients affect evaluation coverage and recommendation eligibility?

## Migration strategy

Migration should be incremental and preserve the current planner and APIs during transition.

1. Keep the existing Food-based planner available as a fallback for search, snacks, and unsupported meal types.
2. Introduce a small curated set of versioned recipes that reference existing Food records.
3. Evaluate recipe compositions through the existing deterministic evaluation engine.
4. Add fixed Meal Templates for common meal occasions.
5. Add parameterized slots only where real curated recipe candidates exist.
6. Change breakfast, lunch, and dinner planning to prefer complete recipe/template candidates.
7. Retain individual-food fallback only when no complete candidate is available, and label it clearly.
8. Add recipe/template provenance to meal-plan responses and immutable snapshots.
9. Expand cuisines and user-created recipes incrementally.
10. Remove individual-food selection as the default only after recipe coverage and regression tests are sufficient.

This migration does not require a second food database, changes to the clinical policy engine, or a separate nutrition calculation path.

## Future vision roadmap

This architecture naturally supports an incremental roadmap:

1. Personalized meal planning based on active targets, conditions, evidence, and history.
2. Grocery lists generated from approved Daily Meal Plans.
3. Pantry tracking and deterministic leftover reuse.
4. Budget-aware substitutions using explicit cost metadata.
5. Allergy and preference-aware candidate filtering.
6. International cuisines represented through recipe and template metadata.
7. User-created recipes with reviewable canonical ingredient mappings.
8. AI-assisted recipe import, extraction, and ingredient mapping.
9. Continued deterministic, evidence-backed nutrition evaluation and recommendation explanations.

At every stage, the canonical Food table remains the nutrition source, the existing deterministic policy engine remains the clinical source of truth, and ranking features remain separate from nutrient calculation and clinical policy decisions.

## Shadow planner verification and Phase 6 gate

The recipe/template planner is first validated in shadow mode. `ShadowMealPlanningService` is an internal provider with no HTTP route and is not called by the active production planner. It selects approved Meal Template Versions, resolves approved Recipe Versions before explicitly permitted canonical-food fallbacks, evaluates the assembled composition through the existing Recipe Evaluation pipeline, and ranks valid candidates deterministically.

`PlannerComparisonService` executes the production and shadow planners with the same user and requested date. It returns an internal comparison containing:

- selected production and shadow meals by meal type;
- compatibility score and evidence-coverage deltas;
- active target/policy coverage and deferred policy identifiers;
- shadow ranking inputs and rationale;
- template, recipe, canonical-food, and evaluation provenance;
- deterministic reasons for missing or differing selections.

The comparison service must remain diagnostic infrastructure. It must not be exposed through production controllers, change recommendation APIs, or influence planner selection.

`ShadowPlanningProfilerService` is the observational companion to the comparison service. It executes the shadow planner and daily aggregate evaluator with an optional internal instrumentation context and reports stage timings, evaluation workload, repository-call estimates, candidate bounds, limit hits, bottlenecks, and optimization opportunities. Normal planner calls do not receive the instrumentation context, and profiling does not alter candidate ordering, policy decisions, or production responses.

### Shadow planner strengths

- The same canonical Food records and deterministic evaluation engine are used by both planners.
- Recipes and templates remain structural; clinical logic remains in the policy/evaluation layer.
- Approved versions, explicit fallback permission, and stable tie-breaking make candidate selection reproducible.
- Candidate expansion is bounded per slot and per template to prevent unbounded Cartesian-product growth.
- Evaluation failures exclude invalid shadow candidates rather than producing guessed nutrition values.
- Provenance identifies the template version, resolved source per slot, canonical foods, evaluator, policy set, and recipe fingerprint.

### Known limitations before migration

These are migration gates rather than reasons to redesign the domain:

1. Candidate evaluation currently loads policy context and canonical component data for each composition. The bounded search prevents runaway work, but latency and database-call budgets must be measured with representative template and recipe counts before activation.
2. The current ranking is meal-local. It does not yet enforce daily aggregate targets across breakfast, lunch, dinner, and snacks. Phase 6 must not claim daily-plan clinical optimization until this is explicitly validated or the active scope is limited to independent meal slots.
3. `clinicalEligibility` is currently a projection of policy deferral state, not an independent clinical judgment. A candidate with a deferred policy is ranked lower and remains traceable; migration requires explicit acceptance rules for which deferrals make a candidate ineligible.
4. Canonical-food fallback is intentionally narrow and may produce limited coverage until approved recipes and templates exist for the relevant meal types and cuisines. Migration requires sufficient curated candidate coverage and regression fixtures for unsupported cases.
5. Historical meal-plan replay still requires the eventual plan/snapshot integration to retain the selected template version, recipe versions, component quantities, canonical nutrient identity, policy-set fingerprint, and evaluation timestamp. A live shadow result is not by itself a historical record.

### Required pre-activation engineering work

Before the planner can be activated, shadow validation must move from independent meal-slot comparison to complete Daily Meal Plan analysis. Breakfast, lunch, dinner, and snacks must be assembled and evaluated as a daily aggregate so remaining daily nutrition targets, active policy coverage, and deferred evidence are considered across the whole plan. A high-scoring lunch must not be treated as optimal if the complete plan creates an avoidable target conflict.

Performance profiling must measure, for representative and worst-case data sets:

- candidate counts per slot, template, meal, and day;
- canonical-food and recipe reads;
- policy-context loads and evaluation calls;
- wall-clock latency and p95 latency for a complete shadow day;
- memory use and the number of discarded invalid candidates.

The implementation roadmap must establish explicit activation budgets for these measurements before migration. At minimum, the acceptance target is that candidate evaluations remain within configured bounds, query growth is bounded rather than proportional to an unbounded search space, and complete-day p95 latency does not regress beyond the agreed production baseline tolerance. The exact numeric budgets must be measured against representative data and recorded as regression-test thresholds, with a documented optimization response when any threshold is exceeded.

Historical replay must use a captured identity rather than current live state. A replayable plan needs the selected Meal Template Version, Recipe Version identifiers, component quantities and units, canonical Food/Serving provenance, nutrient fingerprints or immutable nutrient profiles, evaluator version, policy-set fingerprint, target/policy provenance, and evaluation timestamp. If any fingerprint no longer matches, the system must replay from captured evidence or report replay unavailable; it must not silently recompute with current data.

Deferred policies are not approvals. Missing, stale, conflicting, unsupported, or out-of-scope evidence must remain explicitly classified in the comparison and plan result. Migration rules must define which deferrals make a candidate ineligible, which merely lower ranking confidence, and how the user-facing fallback behaves. No template, recipe, ranking score, or AI explanation may convert a deferral into clinical suitability.

### Clinical validation fixture workstream

Phase 6 must include deterministic representative fixtures before planner activation. These fixtures validate the interaction between meal composition, daily aggregates, active policy outputs, evidence freshness, deferrals, and provenance. They are validation scenarios, not new clinical rules.

The minimum fixture matrix should include:

| Scenario | Required validation focus |
| --- | --- |
| Healthy adult | General Nutrition targets, complete culturally realistic meals, no unnecessary clinical deferrals |
| Diabetes | Approved individualized carbohydrate evidence, carbohydrate target adherence, missing/expired target deferrals |
| Hypertension | Cardiovascular/general sodium precedence and meal-level sodium behavior |
| CKD Stage 3 | Non-dialysis CKD applicability, eGFR freshness, protein and active target provenance |
| CKD Stage 5 / Dialysis | Explicit dialysis status and modality, correct dialysis-context ownership, missing or conflicting modality deferrals |
| Diabetes + CKD | Independent Diabetes and CKD policy interaction, preserved supporting provenance, no implicit precedence |
| CKD + Hypertension | CKD and cardiovascular/general sodium interaction, deterministic precedence and deferral behavior |
| Hyperlipidemia | Supported-policy behavior where available; otherwise explicit unsupported-policy deferral rather than invented lipid guidance |
| Anemia + CKD | CKD behavior plus explicit deferral for unsupported anemia-specific guidance or missing approved evidence |

Each fixture must verify:

- realistic complete meal composition rather than isolated foods;
- daily aggregate nutrition across all planned meal slots;
- adherence to applicable approved policy targets;
- identical output, ordering, scores, fingerprints, and provenance on repeated runs;
- correct distinction between missing, stale, conflicting, unsupported, and inapplicable evidence;
- selection of approved recipes/templates before permitted canonical-food fallback;
- no alcohol, condiments, sauces, spices, or isolated ingredients selected as complete meals;
- preserved supporting evidence when policies interact or one policy defers.

Where a named condition does not yet have an approved policy or evidence model, the expected result is a deterministic scoped deferral. The fixture must assert that the planner does not infer a diagnosis, target, safety judgment, or recommendation from the condition name alone.

Portion optimization is a later deterministic enhancement, not a prerequisite implementation in the shadow phase. It may adjust approved component quantities against remaining daily targets, but every proposed quantity must be re-evaluated by the existing engine and preserve component, target, policy, and provenance evidence. Portion optimization must never modify nutrient calculations or clinical policy decisions.

### Historical replay validation

Phase 6.4 adds internal capture and replay validation without exposing a new API or changing the active planner. A
historical shadow-plan snapshot records the selected template version, recipe versions, resolved component quantities and
units, canonical Food/Serving references and nutrient fingerprints, target and policy provenance, deferred policies,
policy-set fingerprint, evaluation timestamp, evaluator fingerprints, and a snapshot fingerprint. Replay uses those
captured inputs through the existing deterministic recipe evaluation pipeline rather than resolving the latest recipe or
template versions.

This provides reproducibility for immutable recipe/template versions and unchanged canonical nutrient data. Canonical Food
records are currently mutable, so replay compares their captured fingerprints and reports exact replay as unavailable when
they differ. It does not silently accept current nutrient values. Food revisioning or immutable nutrient-profile capture is
therefore a documented future enhancement, not an assumption of the current model. Replay explicitly supports empty
plans, deferred policies, and unsupported-condition contexts; none is interpreted as clinical approval.

### Phase 6.5 pre-activation review gate

Before any active migration, an independent engineering review must assess the entire shadow planner: maintainability and
dependency boundaries; deterministic behavior and clinical safety; daily aggregate correctness; performance, query volume,
caching, and candidate bounds; recipe/template/provenance consistency; historical replay guarantees; deferred-policy
semantics; parity with the production planner; migration and rollback; authorization and private-data isolation; and
remaining technical debt. It must also assess whether future preferences, allergies, budgets, groceries, leftovers, and
AI-assisted recipe import can remain ranking/input concerns without changing clinical evaluation.

The review must produce a documented go/no-go recommendation. Correctness, determinism, clinical safety, historical
reproducibility, or maintainability risks block Phase 7 unless a tested mitigation is documented. Phase 7 must not begin
merely because the shadow planner is available; activation requires explicit review and approval.

#### Phase 6.5 assessment

Current recommendation: **No-Go for Phase 7 activation**.

The shadow planner is structurally sound for continued internal validation: it uses the canonical Food composition path,
the existing deterministic evaluation engine, bounded candidate search, daily aggregate evaluation, explicit policy
deferrals, and internal profiling. The clinical fixture and replay tests establish deterministic behavior for the currently
supported scenarios.

Activation remains blocked by these concrete findings:

1. Canonical Food and Serving data are mutable. Replay detects a nutrient-fingerprint mismatch, but cannot reconstruct the
   original nutrient state after mutation. Historical replay therefore does not yet meet the strongest reproducibility
   requirement for an active planner.
2. Profiling instrumentation exists, but representative p95 latency, query, memory, and candidate-evaluation budgets have
   not yet been measured and accepted as regression thresholds for production activation.
3. Recipe/template coverage and fallback safety still require production-sized validation for all supported meal types and
   user contexts; unsupported or deferred evidence must remain visibly non-approval during migration.

These are activation-readiness blockers, not reasons to redesign the planner. The recommended next work is to resolve or
explicitly accept the canonical-data replay limitation, establish measured performance gates, and complete production-sized
shadow comparison coverage. Until then, the existing food-based planner remains the only production planner and the shadow
planner remains internal.

### Recommended Phase 6 acceptance criteria

Before replacing the production planner for any meal type:

1. Comparison runs are deterministic for identical user, date, template, recipe, and canonical-food inputs.
2. Every selected shadow meal is complete under its template, uses only approved Recipe Versions or explicitly permitted eligible Food fallbacks, and has complete provenance.
3. No alcohol, condiment, isolated ingredient, or disallowed planning class is selected as a fallback meal component.
4. Shadow evaluation uses the existing deterministic engine and produces no nutrient values independent of canonical Foods.
5. Representative latency, query count, and candidate-count limits are measured and remain within agreed budgets.
6. Policy deferrals and missing evidence have explicit, tested migration behavior; the planner never treats missing evidence as clinical approval.
7. Comparison fixtures cover higher/lower scores, equal scores, evidence-coverage differences, deferred policies, missing candidates, recipe candidates, and canonical fallbacks.
8. The clinical fixture matrix passes for supported scenarios and produces explicit deferrals for unsupported or insufficient evidence scenarios.
9. Historical persistence or snapshot capture can replay the selected plan without depending on current recipe, Food, or policy state.
10. A controlled rollout or per-meal-type feature flag allows immediate fallback to the existing planner without changing its behavior.

Until these criteria are met, the food-based planner remains the sole production planner.

## Decision summary

NutriApp should evolve from food-ranked meal planning to dish- and recipe-based meal planning. Recipes provide culturally meaningful compositions from canonical foods, while Meal Templates provide fixed or parameterized meal structure. The planner ranks complete meals, but deterministic policy evaluation remains the single source of truth for nutrition, compatibility, recommendations, deferrals, provenance, and historical reproducibility.
