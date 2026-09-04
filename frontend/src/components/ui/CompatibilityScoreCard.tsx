import React from 'react';
import { Info } from 'lucide-react';
import { Badge } from './Badge';
import { Card } from './Card';

export interface CompatibilityScoreCardProps {
  score: number;
  partial?: boolean;
  title?: string;
  ariaLabel?: string;
}

/** Shared presentation for an existing deterministic compatibility result. */
export const CompatibilityScoreCard: React.FC<CompatibilityScoreCardProps> = ({
  score,
  partial = false,
  title,
  ariaLabel = 'Compatibility score',
}) => {
  const scoreLabel = partial
    ? 'Supporting score'
    : score >= 80
      ? 'Looks like a great fit'
      : score >= 50
        ? 'A reasonable choice with trade-offs'
        : 'Worth balancing with other choices';

  return (
    <Card
      role="region"
      className={`compatibility-score-card ${partial ? 'is-partial' : 'is-complete'}`}
      aria-label={ariaLabel}
      padding="md"
    >
      {partial && (
        <div className="compatibility-coverage-notice" role="status">
          <Info size={17} aria-hidden="true" />
          <div>
            <strong>Compatibility check is incomplete</strong>
            <p>Some clinically relevant nutrition guidance was not included in this compatibility score.</p>
          </div>
        </div>
      )}

      <div className="compatibility-score-header">
        <div>
          <span className="compatibility-score-kicker">{title ?? (partial ? 'Compatibility' : 'Compatibility score')}</span>
          <h2>{partial ? 'Supporting score' : 'Compatibility score'}</h2>
        </div>
        <Badge variant={partial ? 'clinical' : 'success'} size="sm">
          {partial ? 'Partial check' : 'Complete check'}
        </Badge>
      </div>

      <div className="compatibility-score-value-row">
        <div className="compatibility-score-value" aria-label={`${score} out of 100`}>
          <strong>{score}</strong>
          <span>/ 100</span>
        </div>
        <div>
          {!partial && <strong className="compatibility-score-label">{scoreLabel}</strong>}
          <p>{partial
            ? 'This score reflects only the nutrition guidance that could currently be evaluated.'
            : 'This score reflects the nutrition guidance currently evaluated for your profile.'}</p>
        </div>
      </div>
    </Card>
  );
};
