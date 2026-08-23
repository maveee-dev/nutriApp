  # ADR 0008: Policy Precedence and Conflict Resolution

- Status: Proposed
- Date: 2026-08-21

## Context

Multiple policy groups may govern the same decision dimension. Examples include a
General Nutrition sodium limit and a Cardiovascular sodium limit, or a General
Nutrition protein baseline and a CKD or dialysis protein rule.

Precedence must not be inferred from policy version, registration order, or
condition-name string matching. It must be explicit, deterministic, auditable,
and reproducible in historical snapshots.

## Decision

Every policy registration that can participate in a shared decision must declare:

- the stable conflict key identifying the decision dimension;
- its explicit precedence rank for that key;
- the ownership mode: `owning` or `supporting`;
- required evidence and applicability conditions;
- the policy and semantic versions.

The resolver applies the following process:

1. Discard policies that are inapplicable or whose required evidence is missing,
   stale, invalid, or conflicting.
2. Group remaining decisions by stable conflict key.
3. Select the applicable policy with the highest explicitly registered precedence
   for that conflict key.
4. Use a narrower policy over a general policy only when the narrower policy has
   explicitly registered higher precedence and its evidence is valid.
5. Preserve lower-precedence decisions as supporting provenance.
6. If equally authoritative policies disagree, emit a deterministic deferral
   rather than selecting by registration order or policy version.

Policy version, creation time, database order, and lexical policy ID must never
serve as precedence rules.

## Canonical precedence relationships

The following relationships are explicit policy decisions, not evaluator
inferences:

- applicable condition-specific policy over General Nutrition for decisions it
  explicitly owns;
- dialysis modality policy over non-dialysis CKD only when active, valid modality
  evidence is present;
- supporting General Nutrition evidence remains preserved when a narrower policy
  owns the selected decision;
- unsupported or insufficiently evidenced narrower policies do not override a
  valid broader policy and may produce scoped deferrals according to their policy
  ownership.

Future policy groups must add their precedence relationships through registration
metadata and focused tests. Adding a policy must not silently change an existing
conflict dimension.

## Validation and conflict behavior

Registration validation must reject:

- duplicate policy IDs or versions;
- duplicate ownership for the same conflict key and precedence rank;
- missing precedence metadata for a shared conflict key;
- precedence declarations that contradict an approved policy ADR;
- dependency cycles that prevent deterministic evaluation.

Runtime resolution must preserve the selected policy, discarded candidates,
supporting provenance, conflict key, precedence decision, and any deferral reason.

## Historical reproducibility

Snapshots must preserve the conflict key, participating policy IDs and versions,
precedence metadata, selected decision, supporting provenance, and deferrals. A
future resolver must be able to replay the decision without relying on current
registration order or mutable policy configuration.

## Non-goals

This ADR does not add clinical targets, change existing policy behavior, or define
new condition-specific policies. It defines the precedence contract that future
resolved-rule and target migrations must follow.
