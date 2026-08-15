// Project Detail (Tarea 4.3, §16; re-estilizado Tarea E.1). Reads the
// resolver's already-reduced detail (src/health/projectDetail.ts) — no
// computation here, just rendering: header + health, DIMENSIONS, "Why?" and
// "Recommended actions", following the spec's ASCII mockup (§16, §17).
// Sin referencia visual directa del mockup (code.html solo cubre Dashboard,
// plan Fase E) — se extrapolan los mismos tokens/patrones usados en
// Dashboard.tsx y AttentionQueue.tsx (cards `rounded-xl border
// border-outline-variant bg-surface shadow-sm`, cabeceras `bg-surface-slate`,
// divisores suaves `divide-outline-variant/50`). "Why?"/"Recommended
// actions" quedan con su maquetación original — Tarea E.2 les añade
// Explainer Tooltips.
import React from 'react';
import type { DimensionDetail, DimensionName, ProjectDetail as ProjectDetailData } from '../../health/projectDetail';
import { StatusBadge } from './ui/StatusBadge';
import { InfoIcon, WarningIcon } from './ui/icons';

interface ProjectDetailProps {
  detail: ProjectDetailData;
  onBack: () => void;
}

const DIMENSION_LABELS: Record<DimensionName, string> = {
  schedule: 'Schedule',
  delivery: 'Delivery',
  scope: 'Scope',
  capacity: 'Capacity',
  dependencies: 'Dependencies',
};

const DimensionRow: React.FC<{ dimension: DimensionDetail }> = ({ dimension }) => (
  <li className="flex items-center justify-between p-4">
    <span className="font-label-bold text-label-bold text-text-heading">{DIMENSION_LABELS[dimension.name]}</span>
    {dimension.score === null || dimension.status === null ? (
      <span className="font-body-sm text-body-sm text-on-surface-variant">N/A — Insufficient data</span>
    ) : (
      <span className="flex items-center gap-2">
        <span className="font-data-mono text-data-mono font-bold text-text-heading">{dimension.score}</span>
        <StatusBadge status={dimension.status} />
      </span>
    )}
  </li>
);

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ detail, onBack }) => {
  const { projectName, healthScore, status, trend, dimensions, factors, recommendations, reason, reasonKind } =
    detail;

  return (
    <section className="flex flex-col gap-gutter">
      <button
        type="button"
        onClick={onBack}
        className="self-start font-label-bold text-label-bold text-primary transition-colors hover:text-primary-container"
      >
        {'←'} Back to dashboard
      </button>

      <section className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-headline-lg text-headline-lg text-text-heading">{projectName}</h1>
          {status && <StatusBadge status={status} />}
        </div>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          Health: {healthScore === null ? 'N/A' : healthScore}
          {healthScore !== null && <span className="text-outline">/100</span>}
        </p>
        {!reason && (
          <p className="mt-2 font-data-mono text-data-mono text-on-surface-variant">Trend: {trend}</p>
        )}
      </section>

      {reason ? (
        <section
          className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm ${
            reasonKind === 'failed' ? 'border-status-critical/40 bg-error-container/40' : 'border-outline-variant bg-surface'
          }`}
        >
          {reasonKind === 'failed' ? (
            <WarningIcon size={18} className="mt-0.5 shrink-0 text-status-critical" />
          ) : (
            <InfoIcon size={18} className="mt-0.5 shrink-0 text-on-surface-variant" />
          )}
          <p className="font-body-md text-body-md text-on-surface-variant">
            {reasonKind === 'failed' ? `Analysis unavailable — ${reason}` : reason}
          </p>
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
            <div className="border-b border-outline-variant bg-surface-slate p-4">
              <h2 className="font-headline-sm text-headline-sm uppercase text-text-heading">Dimensions</h2>
            </div>
            <ul className="divide-y divide-outline-variant/50">
              {dimensions.map((dimension) => (
                <DimensionRow key={dimension.name} dimension={dimension} />
              ))}
            </ul>
          </section>

          <section>
            <h2>Why?</h2>
            {factors.length === 0 ? (
              <p>
                {healthScore === null
                  ? 'N/A — Insufficient data to explain this yet.'
                  : 'No issues found — this project looks healthy.'}
              </p>
            ) : (
              <ol>
                {factors.map((factor) => (
                  <li key={factor.code}>{factor.message}</li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h2>Recommended actions</h2>
            {recommendations.length === 0 ? (
              <p>No actions needed right now.</p>
            ) : (
              <ol>
                {recommendations.map((recommendation) => (
                  <li key={recommendation.code}>{recommendation.message}</li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  );
};
