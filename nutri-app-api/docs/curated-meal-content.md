# Curated Recipe and Meal Template Content Foundation

## Purpose

This document records the first curated content set for the active recipe/template planner. It is intentionally a content
and seeding milestone, not a new nutrition or clinical-policy layer.

Canonical `Food` and `Serving` records remain the only nutrition source. Recipes store composition, quantities, roles, and
provenance; they never store nutrient values. Meal templates describe structural meal roles and contain no clinical rules.

## Initial curated recipe library

The deterministic seed defines ten approved Filipino recipe versions:

1. Chicken Adobo
2. Tinola
3. Sinigang
4. Ginisang Gulay
5. Pinakbet
6. Tortang Talong
7. Grilled Fish
8. Chicken with Vegetables
9. Oatmeal with Fruit
10. Yogurt with Fruit

Every component is resolved by an explicit canonical Food-name candidate list. The seed fails loudly when a required
canonical Food is absent; it does not create substitute nutrient values. Components use grams or an existing canonical
serving and retain the Food and optional Serving references.

The recipes are marked `OFFICIAL`, `SHARED`, and `APPROVED` by the curated-content workflow. Stable identifiers make the
seed idempotent. Existing versions are not edited, preserving recipe immutability.

## Initial meal template library

Three approved Filipino templates are defined:

- **Filipino Rice Meal** — required parameterized Main Dish, required Staple, optional Fruit; applicable to lunch and
  dinner.
- **Breakfast** — fixed Oatmeal with Fruit recipe and optional canonical Fruit; applicable to breakfast.
- **Snack** — fixed Yogurt with Fruit recipe; applicable to snacks.

The templates use culturally meaningful roles such as Main Dish, Staple, and Fruit. They do not assume that every Main
Dish is meat-based; vegetable, fish, tofu, and soup-based recipes can be added using the same role model.

## Approval workflow

1. Select canonical Food and Serving records from the database.
2. Map recipe ingredients to those records with explicit quantities and units.
3. Record source, cuisine, version, and approval metadata.
4. Create an immutable `RecipeVersion` and approve it after composition review.
5. Add or update a structural `MealTemplateVersion` referencing approved recipe versions or explicitly permitted Food
   fallbacks.
6. Evaluate through `RecipeEvaluationService` and the existing deterministic policy engine.
7. Validate meal-level and daily-plan output across supported clinical fixtures before publishing.

Editing ingredients, portions, or composition creates a new recipe version. It must never rewrite historical versions.

## Best practices for canonical mapping

- Prefer an exact canonical Food identifier when available.
- Use a controlled, reviewed name mapping only when the source name has legitimate canonical alternatives.
- Select an existing Serving only when the serving represents the intended portion; otherwise use grams.
- Do not copy nutrient values into the recipe or template.
- Preserve canonical Food source and serving provenance in evaluation output.
- Treat missing or ambiguous mappings as seed failures, not opportunities to guess.

## Validation expectations

With curated content available, the active planner should return complete meals rather than standalone alcohol,
condiments, sauces, spices, juice, agave, or isolated side items. Canonical Food fallback remains constrained by planning
class and is used only when a template explicitly permits it and no complete candidate is available.

Clinical suitability continues to come from deterministic evaluation. The content seed does not add CKD, diabetes,
hypertension, dialysis, or other condition-specific rules.

## Current coverage and gaps

The initial set supports Filipino cuisine and breakfast, lunch, dinner, and snack meal types. It is a representative
foundation, not a complete Filipino food library. Additional gaps include:

- broader vegetable, tofu, fish, and soup recipe coverage;
- more canonical serving mappings for culturally specific portions;
- Japanese, Mediterranean, and other cuisine libraries;
- sufficient approved candidates for every clinical fixture and meal slot;
- preference, allergy, budget, seasonal, leftovers, and pantry metadata.

Those additions should remain incremental and should affect planner candidate selection or ranking only. They must not alter
canonical nutrient calculation or clinical policy evaluation.

## Operational note

The seed implementation is `prisma/import/curated-meal-content.seed.ts` and is invoked by `prisma/seed.ts`. It requires the
runtime database role to have read/write access to canonical Food/Serving records and the Recipe/MealTemplate tables. If
the role is read-only or lacks privileges on tables created by migrations, the seed must stop and report the permission
failure rather than partially inventing or bypassing content.
