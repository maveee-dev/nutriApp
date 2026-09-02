# Laboratory Analysis

The laboratory module has two compatible storage paths:

- `LaboratoryResultsService` and `/laboratory/results` remain the existing
  evidence API used by nutrition policy resolution.
- `LaboratoryReportService` and `/laboratory/reports` provide append-only
  report envelopes, deterministic interpretation, trends, and educational
  projections. Older standalone results are exposed as synthetic one-result
  reports so they remain visible without being copied or rewritten.

`LaboratoryAnalysisService` compares values only with reference ranges supplied
on the report. It emits `low`, `normal`, `high`, or `unknown`, and conservative
trend labels. It never creates nutrition targets, activates policies, changes
compatibility scores, or gives treatment advice. `LaboratoryConsultationProjector`
is an optional adapter for consultation; it returns the same lab-derived
educational insights and safely degrades if that optional projection is
unavailable.

Reports are immutable after creation. The DELETE route intentionally returns
`409 Conflict` rather than mutating or deleting historical clinical evidence.
