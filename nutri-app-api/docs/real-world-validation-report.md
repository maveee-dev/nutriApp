# Real-World End-to-End Validation Report

## Purpose

This document records the v1 validation milestone for the existing deterministic evaluation pipeline. It is a validation artifact, not a new runtime contract. The production evaluator, planner, recommendation services, consultation services, APIs, and frontend behavior remain unchanged.

## Automated scenario coverage

The shadow clinical matrix now includes:

| Scenario | Expected result |
| --- | --- |
| Healthy adult | General nutrition provenance and complete meal-plan evaluation |
| Hypertension | Cardiovascular sodium precedence and negative evidence for excessive sodium |
| Diabetes with approved target | Individualized carbohydrate contribution and daily-policy provenance |
| Diabetes without approved target | Explicit carbohydrate-policy deferral; no inferred target |
| CKD Stage 3 | Non-dialysis CKD policy with current eGFR |
| CKD Stage 5, non-dialysis | Non-dialysis applicability boundary with current eGFR |
| Hemodialysis | Independent hemodialysis protein policy with explicit modality evidence |
| Peritoneal dialysis | Independent peritoneal-dialysis policy; no hemodialysis inheritance |
| Diabetes + CKD | Separate carbohydrate and renal evidence/provenance |
| CKD + hypertension | Renal protein and cardiovascular sodium policies together |
| Diabetes + CKD + hypertension | All three supported policy domains together |
| CKD with missing eGFR | CKD personalization deferred while generic fallback remains explicit |
| CKD with stale eGFR | `stale-egfr` deferral; no CKD-specific approval |
| CKD with invalid eGFR unit | `invalid-egfr-unit` deferral; no inferred approval |
| Conflicting dialysis modality | Conflicting modality deferral; neither dialysis modality is guessed |
| Hyperlipidemia, gout, and anemia | No unsupported condition is claimed as an active policy |

The runtime condition fixture also verifies that:

- food compatibility is driven by applicable safety constraints such as sodium;
- protein and carbohydrates remain contributions rather than standalone negative compatibility reasons;
- portion-independent policy resolution is deterministic;
- combined-condition target provenance contains the expected policy IDs;
- compatibility changes for an actual sodium violation while contribution data remains available.

## Planner and replay coverage

Existing shadow-planner validation verifies that each validated plan:

- contains complete breakfast, lunch, and dinner meals;
- preserves template approval, recipe provenance, canonical-food provenance, and fingerprints;
- aggregates the selected day through the deterministic daily evaluation path;
- excludes standalone alcohol, condiments, sauces, spices, beverages, and isolated ingredients when the validator identifies them as complete meals;
- produces identical fingerprints for repeated deterministic runs.

Existing historical replay validation verifies repeated replay, newer recipe/template versions, deferred policies, empty plans, unsupported-condition scenarios, and canonical-food fingerprint limitations. Historical replay remains explicit about the current mutable-food limitation.

## Frontend contract coverage

The existing frontend tests cover:

- neutral rendering for `insufficient-evidence` rather than presenting a misleading poor score;
- separate compatibility and contribution presentation;
- upper-limit versus adequacy wording in daily target cards;
- evidence remaining behind the optional explanation interaction;
- recipe/template meal mapping to the existing meal-log request, including serving IDs;
- loading and empty recommendation states.

The production frontend build passes. The UI should still be manually checked for the complete authenticated journey because the current automated frontend suite is component-level rather than browser-level.

## Manual release checklist

Run these checks against the running application with representative authenticated profiles and the populated database:

1. Evaluate a low-sodium food and a high-sodium food for a general user and a hypertension user. Confirm score direction, explanation direction, and sodium provenance.
2. Evaluate a banana or similar low-protein food for CKD. Confirm it is not penalized merely for low protein, while protein remains visible as contribution/progress.
3. Verify Diabetes with an approved carbohydrate target and without one. Confirm contribution/progress in the first case and an explicit deferral in the second.
4. Verify CKD non-dialysis, hemodialysis, and peritoneal dialysis with current, stale, missing, and conflicting evidence. Confirm no modality is inferred.
5. Verify combined Diabetes + CKD + hypertension. Confirm active policy context, target provenance, deferrals, and explanations agree across food evaluation, daily summary, meal assessment, planner, recommendations, and consultation.
6. Generate a recipe/template daily plan and confirm complete meals, daily aggregate evaluation, template/version IDs, recipe/version IDs, canonical serving IDs, and planner provenance are returned.
7. Log a recommended meal, customize a slot, re-evaluate it, and confirm the final logged meal uses the returned serving IDs and preserves the customized evaluation provenance.
8. Navigate to a historical date and confirm stored semantics and replay limitations are shown without recomputation from current policy metadata.
9. Check loading, empty, error, retry, insufficient-evidence, deferred-policy, responsive, keyboard, and screen-reader states.

## Performance and regression checks

The existing shadow planner profiler remains the internal measurement path. This milestone does not optimize planner execution or alter candidate ranking. Before release, collect a representative runtime profile for:

- one healthy profile;
- a three-policy combined profile;
- a dialysis profile;
- a populated recipe/template database;
- an incomplete-evidence profile.

Record total latency, stage timings, candidate counts, evaluations, repository calls, and bounded-search statistics. Any optimization should follow those measurements rather than assumptions.

## Current validation status

- Backend focused validation: passed, including the expanded shadow matrix and runtime condition fixtures.
- Frontend component validation: passed.
- Backend production build: passed.
- Frontend production build: passed.
- Live authenticated database/API verification: manual release step; this environment does not provide a reliable authenticated Neon session for a truthful production response claim.

## Findings and limitations

No correctness regression or architectural limitation was found in the automated validation path. Remaining release work is operational validation rather than evaluator redesign:

- execute the authenticated API scenarios against the same seeded database used by the frontend;
- capture real planner latency and query counts under representative data;
- complete browser-level accessibility and responsive checks;
- continue documenting mutable canonical-food replay limitations until food revisioning is intentionally introduced.

