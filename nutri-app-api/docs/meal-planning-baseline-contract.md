# Meal Planning Baseline Contract

Status: Phase 1 compatibility baseline

This document records the behavior that must remain stable while NutriApp transitions from individual-food planning to Recipe, Meal Template, and Meal planning.

## Current planner behavior

- The planner is authenticated and scoped to the current user.
- The daily endpoint is `GET /nutrition/meal-plans/daily`.
- The optional `date` query parameter is an ISO date. If omitted, the service uses the current UTC date.
- Nutrition context and active targets are loaded through `NutritionPolicyService`.
- Food candidates come from the canonical Food database.
- Each candidate is evaluated through `FoodEvaluationService` and the existing deterministic evaluation engine.
- Candidates are ranked by compatibility score, then stable food name and ID ordering.
- Category diversity is used when selecting breakfast, lunch, dinner, and snack slots.
- Planner eligibility metadata prevents known non-meal classes from being selected as complete meals.
- If no suitable candidates exist, the endpoint returns a valid plan with an empty `items` array rather than inventing a meal.

## Current response contract

The response is versioned as `apiVersion: "v1"` and includes:

- Requested date and `asOf` timestamp
- Selected meal items and canonical Food/Serving identifiers
- Meal type, name, serving, quantity, and category
- Food evaluation score, coverage, reasons, and contributions
- Active targets and target provenance
- Deferred policy information
- Policy-set fingerprint when available
- Food source, selection strategy, and evaluator version
- Limitations explaining unavailable evidence or unsupported personalization

The frontend consumes this contract through the daily meal-plan API client, React Query hook, and dashboard meal-plan component. Logging a suggested item continues to use the existing meal creation contract.

## Compatibility rules

The following must remain true during later phases:

1. Existing Food records remain valid canonical nutrition sources.
2. Existing food evaluation and meal logging APIs remain backward compatible.
3. Historical food-based plans and snapshots are not rewritten when recipes or templates are introduced.
4. Recipe/template fields are additive and may not remove existing Food/Serving references from compatible responses without an explicit API version change.
5. Deterministic output must be reproducible for the same user context, date, catalog, policy set, and ranking inputs.
6. Policy evaluation, nutrient calculation, deferral behavior, and provenance remain owned by the existing deterministic services.
7. A recipe/template planner may run in preview or shadow mode before becoming the active planner.
8. Individual-food fallback remains available while recipe/template coverage is incomplete.

## Rollback boundary

The current Food-based planner is the Phase 1 rollback boundary. Any later planner implementation must be able to return to this behavior without changing existing meal logs, evaluation snapshots, or API consumers.
