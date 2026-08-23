import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { EvaluationSnapshotPayload, decodeMealEvaluationSnapshot } from '../../../meals/snapshots/meal-evaluation-snapshot.adapter.js';
import { RecommendationEvidence, RecommendationEvidenceKind, RecommendationEvidenceSource } from '../types/recommendation-evidence.type.js';

export type { EvaluationSnapshotPayload };
export { decodeMealEvaluationSnapshot };

export function snapshotEvidenceSource(snapshot: MealEvaluationSnapshotSource): RecommendationEvidenceSource {
  let payload: EvaluationSnapshotPayload | null = null;
  try { payload = decodeMealEvaluationSnapshot(snapshot); } catch { /* Older snapshots may not carry the additive metadata. */ }
  return {
    sourceType: 'meal-evaluation-snapshot',
    sourceId: snapshot.id,
    version: snapshot.snapshotVersion,
    evaluatorVersion: snapshot.evaluatorVersion,
    policyVersion: snapshot.policyVersion,
    ...(payload?.policySetFingerprint == null ? {} : { policySetFingerprint: payload.policySetFingerprint }),
    ...(payload?.snapshotFingerprint == null ? {} : { snapshotFingerprint: payload.snapshotFingerprint }),
    snapshotVersion: snapshot.snapshotVersion,
    evaluatedAt: snapshot.evaluatedAt.toISOString(),
  };
}

export function snapshotEvidence(snapshot: MealEvaluationSnapshotSource, kind: RecommendationEvidenceKind, field: string, value: string | number | boolean | null, explanation: string, unit?: string): RecommendationEvidence {
  return { id: `snapshot-${snapshot.id}-${field}`, kind, source: snapshotEvidenceSource(snapshot), field, value, ...(unit == null ? {} : { unit }), explanation };
}
