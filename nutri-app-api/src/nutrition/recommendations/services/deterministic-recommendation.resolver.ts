import { RecommendationCandidate } from '../types/recommendation-candidate.type.js';
import { RecommendationContext } from '../types/recommendation-context.type.js';
import {
  DEFAULT_RECOMMENDATION_RESOLUTION_CONFIG,
  RecommendationResolutionConfig,
  recommendationLimit,
} from '../types/recommendation-resolution.config.js';
import {
  RecommendationResolution,
  RecommendationResolver,
  RecommendationSuppression,
} from '../types/recommendation-resolver.type.js';
import { RecommendationCategory, RecommendationSeverity } from '../types/recommendation.type.js';

export class DeterministicRecommendationResolver implements RecommendationResolver {
  constructor(
    private readonly config: RecommendationResolutionConfig = DEFAULT_RECOMMENDATION_RESOLUTION_CONFIG,
  ) {}

  resolve(
    context: RecommendationContext,
    candidates: readonly RecommendationCandidate[],
  ): RecommendationResolution {
    const suppressed: RecommendationSuppression[] = [];
    const winners = new Map<string, RecommendationCandidate>();

    for (const candidate of candidates) {
      const existing = winners.get(candidate.conflictKey);
      if (existing == null) {
        winners.set(candidate.conflictKey, candidate);
        continue;
      }
      const winner = this.compare(candidate, existing) < 0 ? candidate : existing;
      const loser = winner === candidate ? existing : candidate;
      winners.set(candidate.conflictKey, winner);
      suppressed.push({
        candidateId: loser.candidateId,
        reason: this.compareRank(candidate, existing) === 0 ? 'duplicate' : 'lower-priority',
        comparedWith: winner.candidateId,
      });
    }

    const ordered = [...winners.values()].sort((left, right) => this.compare(left, right));
    const limit = recommendationLimit(this.config, context.scope);
    const selected = ordered.slice(0, limit);
    for (const candidate of ordered.slice(limit)) {
      suppressed.push({
        candidateId: candidate.candidateId,
        reason: 'context-limit',
        comparedWith: selected[selected.length - 1]?.candidateId,
      });
    }

    return {
      selected: selected.map(({ recommendation }) => recommendation),
      suppressed,
    };
  }

  private compare(left: RecommendationCandidate, right: RecommendationCandidate): number {
    const rankDifference = this.compareRank(left, right);
    if (rankDifference !== 0) return rankDifference;
    return left.candidateId.localeCompare(right.candidateId);
  }

  private compareRank(left: RecommendationCandidate, right: RecommendationCandidate): number {
    const categoryDifference = this.categoryRank(right.recommendation.category) - this.categoryRank(left.recommendation.category);
    if (categoryDifference !== 0) return categoryDifference;

    const severityDifference = this.severityRank(right.recommendation.severity) - this.severityRank(left.recommendation.severity);
    if (severityDifference !== 0) return severityDifference;

    if (left.priority !== right.priority) return right.priority - left.priority;
    if (left.specificity !== right.specificity) return right.specificity - left.specificity;
    return 0;
  }

  private categoryRank(category: RecommendationCategory): number {
    return this.config.categoryRanks[category] ?? 0;
  }

  private severityRank(severity: RecommendationSeverity): number {
    return this.config.severityRanks[severity] ?? 0;
  }
}
