// Attention Queue (Tarea 4.2, §18): "Today's Attention" — the projects that
// most need a human look, already ordered by the resolver
// (src/health/attentionQueue.ts). No computation here, just rendering.
//
// Tarea D.1 (DESIGN.md § Components "Actionable Cards"): tarjeta con
// borde-acento izquierdo de 4px por status, TrendBadge y línea "Main issue"
// con icono `info`, siguiendo code.html § "Today's Attention Queue".
import React from 'react';
import type { AttentionQueueEntry } from '../../health/attentionQueue';
import type { HealthStatus } from '../../metrics/model';
import { TrendBadge } from './ui/TrendBadge';
import { InfoIcon, WarningIcon } from './ui/icons';

interface AttentionQueueProps {
  entries: AttentionQueueEntry[];
  /** Opens the Project Detail screen (Tarea 4.3) for this project. */
  onSelectProject?: (projectKey: string) => void;
}

// Literal class strings (not template interpolation) so Tailwind's static
// scanner picks them up — see Dashboard.tsx's STATUS_DOT_CLASS for the same
// pattern. `border-*` (not `border-l-*`) sets the color on all sides, but
// `border-l-4` leaves width at 0 everywhere except the left edge.
const STATUS_BORDER_CLASS: Record<HealthStatus, string> = {
  CRITICAL: 'border-status-critical',
  AT_RISK: 'border-status-at-risk',
  HEALTHY: 'border-status-healthy',
};

const STATUS_SCORE_CLASS: Record<HealthStatus, string> = {
  CRITICAL: 'text-status-critical',
  AT_RISK: 'text-status-at-risk',
  HEALTHY: 'text-status-healthy',
};

// `deterioration` (Tarea 5.4) already carries the same sign convention as
// `formatDeterioration` (src/health/trend.ts): negative means the project
// got worse. Reusing that logic here instead of a raw `trend` field, since
// AttentionQueueEntry doesn't expose one.
const TREND_UP = '↑';
const TREND_DOWN = '↓';
const TREND_FLAT = '→';
const TREND_PLACEHOLDER = '—';

function deteriorationTrend(deterioration: number | null): string {
  if (deterioration === null) return TREND_PLACEHOLDER;
  if (deterioration < 0) return TREND_DOWN;
  if (deterioration > 0) return TREND_UP;
  return TREND_FLAT;
}

const AttentionQueueCard: React.FC<{
  entry: AttentionQueueEntry;
  onSelectProject?: (projectKey: string) => void;
}> = ({ entry, onSelectProject }) => (
  <li>
    <button
      type="button"
      onClick={() => onSelectProject?.(entry.projectKey)}
      className={`group w-full rounded border border-outline-variant border-l-4 ${STATUS_BORDER_CLASS[entry.status]} bg-surface p-3 text-left transition-colors hover:bg-surface-container-low`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-label-bold text-label-bold text-text-heading transition-colors group-hover:text-primary">
          {entry.projectName}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`font-data-mono text-data-mono font-bold ${STATUS_SCORE_CLASS[entry.status]}`}>
            {entry.healthScore}
          </span>
          <TrendBadge trend={deteriorationTrend(entry.deterioration)} />
        </div>
      </div>
      {entry.deteriorationLabel && (
        <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{entry.deteriorationLabel}</p>
      )}
      {entry.mainIssue && (
        <p className="mt-1 flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
          <InfoIcon size={14} />
          Main issue: {entry.mainIssue}
        </p>
      )}
    </button>
  </li>
);

export const AttentionQueue: React.FC<AttentionQueueProps> = ({ entries, onSelectProject }) => (
  <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
    <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-slate p-4">
      <WarningIcon size={18} className="text-status-critical" />
      <h2 className="font-headline-sm text-headline-sm uppercase text-text-heading">Today&apos;s Attention</h2>
    </div>
    {entries.length === 0 ? (
      <p className="p-6 text-center font-body-sm text-body-sm text-on-surface-variant">
        Nothing needs attention right now.
      </p>
    ) : (
      <ol className="flex flex-col gap-3 p-4">
        {entries.map((entry) => (
          <AttentionQueueCard key={entry.projectKey} entry={entry} onSelectProject={onSelectProject} />
        ))}
      </ol>
    )}
  </section>
);
