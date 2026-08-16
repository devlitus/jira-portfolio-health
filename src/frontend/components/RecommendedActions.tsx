// Recommended Actions (Tarea D.3, Fase D, §17): portfolio-wide list built by
// buildRecommendedActions (Tarea D.1) from every monitored project's already-
// computed recommendations. Reads already-reduced data — no computation
// here, just rendering plus the "Mark reviewed" session-state toggle
// (Adaptación 5, index.tsx's `reviewedKeys`).
import React from 'react';
import type { RecommendedActionItem } from '../lib/recommendedActions';
import type { HealthStatus } from '../../metrics/model';
import { CheckIcon, InfoIcon, WarningIcon } from './ui/icons';

interface RecommendedActionsProps {
  items: RecommendedActionItem[];
  reviewedKeys: Set<string>;
  onToggleReviewed: (projectKey: string, code: string) => void;
}

// Border-accent + icon per severity — same left-accent language as
// Dashboard.tsx's STATUS_COUNT_CARDS/AlertRow. Literal class strings (no
// template interpolation) so Tailwind's static scanner picks them up.
const SEVERITY_STYLE: Record<HealthStatus, { borderClass: string; iconClass: string; icon: React.ReactNode }> = {
  CRITICAL: {
    borderClass: 'border-l-4 border-status-critical',
    iconClass: 'text-status-critical',
    icon: <WarningIcon size={18} />,
  },
  AT_RISK: {
    borderClass: 'border-l-4 border-status-at-risk',
    iconClass: 'text-status-at-risk',
    icon: <WarningIcon size={18} />,
  },
  HEALTHY: {
    borderClass: 'border-l-4 border-status-healthy',
    iconClass: 'text-status-healthy',
    icon: <InfoIcon size={18} />,
  },
};

function reviewKey(projectKey: string, code: string): string {
  return `${projectKey}:${code}`;
}

const RecommendedActionCard: React.FC<{
  item: RecommendedActionItem;
  isReviewed: boolean;
  onToggleReviewed: (projectKey: string, code: string) => void;
}> = ({ item, isReviewed, onToggleReviewed }) => {
  const { borderClass, iconClass, icon } = SEVERITY_STYLE[item.severity];

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border border-outline-variant bg-surface p-4 shadow-sm ${borderClass} ${
        isReviewed ? 'opacity-60' : ''
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${iconClass}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-label-bold text-label-bold text-text-heading">{item.projectName}</span>
          <span className="font-mono uppercase text-body-sm text-on-surface-variant">{item.ruleLabel}</span>
        </div>
        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{item.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onToggleReviewed(item.projectKey, item.code)}
        className="flex shrink-0 items-center gap-1 font-label-bold text-label-bold text-primary transition-colors hover:text-primary-container"
      >
        {isReviewed ? (
          <>
            <CheckIcon size={16} /> Reviewed
          </>
        ) : (
          'Mark reviewed'
        )}
      </button>
    </li>
  );
};

export const RecommendedActions: React.FC<RecommendedActionsProps> = ({ items, reviewedKeys, onToggleReviewed }) => (
  <section className="flex flex-col gap-gutter">
    <div>
      <h1 className="font-headline-lg text-headline-lg text-text-heading">Recommended Actions</h1>
      <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
        Rule-based recommendations across your monitored projects, ordered by severity.
      </p>
    </div>

    {items.length === 0 ? (
      <p className="rounded-xl border border-outline-variant bg-surface p-6 text-center font-body-sm text-body-sm text-on-surface-variant shadow-sm">
        No recommendations right now — every monitored project looks healthy.
      </p>
    ) : (
      <ul className="flex flex-col gap-gutter">
        {items.map((item) => (
          <RecommendedActionCard
            key={reviewKey(item.projectKey, item.code)}
            item={item}
            isReviewed={reviewedKeys.has(reviewKey(item.projectKey, item.code))}
            onToggleReviewed={onToggleReviewed}
          />
        ))}
      </ul>
    )}
  </section>
);
