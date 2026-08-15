// Portfolio overview (Tarea 4.1, §7, §26): executive header, Alerts (§20,
// Tarea 6.1.d), Top Attention and the Health by Project table (with a "⚠"
// badge on rows that have stored alerts). Reads the resolver's
// already-reduced summary (src/health/dashboard.ts) — no computation here,
// just rendering.
import React from 'react';
import type { DashboardProjectRow, DashboardStatusCounts, DashboardSummary } from '../../health/dashboard';
import type { HealthStatus } from '../../metrics/model';
import { StatusBadge } from './ui/StatusBadge';
import { TrendBadge } from './ui/TrendBadge';

// Bento hero card (Tarea C.1, DESIGN.md § Components "Health Progress Bars"):
// one row per status with a dot, count and a proportional bar. `total` is the
// number of *scored* projects (statusCounts sums), so a portfolio with no
// scored projects yet renders empty bars instead of dividing by zero.
// Literal class strings (not template interpolation) so Tailwind's static
// scanner picks them up — see StatusBadge.tsx/TrendBadge.tsx for the same
// pattern.
const HEALTH_BAR_ROWS: {
  key: keyof DashboardStatusCounts;
  label: string;
  dotClass: string;
  barClass: string;
  tooltip: string;
}[] = [
  {
    key: 'critical',
    label: 'Critical',
    dotClass: 'bg-status-critical',
    barClass: 'bg-status-critical',
    tooltip: 'Health score below 60. Immediate attention required.',
  },
  {
    key: 'atRisk',
    label: 'At Risk',
    dotClass: 'bg-status-at-risk',
    barClass: 'bg-status-at-risk',
    tooltip: 'Health score 60–79. Potential blockers detected.',
  },
  {
    key: 'healthy',
    label: 'On Track',
    dotClass: 'bg-status-healthy',
    barClass: 'bg-status-healthy',
    tooltip: 'Health score 80 and above. Proceeding to plan.',
  },
];

const HealthStatusBar: React.FC<{
  label: string;
  dotClass: string;
  barClass: string;
  count: number;
  total: number;
  tooltip: string;
}> = ({ label, dotClass, barClass, count, total, tooltip }) => (
  <div className="group relative">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${dotClass}`} />
        <span className="font-label-bold text-label-bold text-text-heading">{label}</span>
      </div>
      <span className="font-data-mono text-data-mono font-bold text-text-heading">{count}</span>
    </div>
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-container">
      <div
        className={`h-full ${barClass}`}
        style={{ width: total === 0 ? '0%' : `${(count / total) * 100}%` }}
      />
    </div>
    <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-48 rounded bg-inverse-surface px-3 py-2 font-body-sm text-body-sm text-inverse-on-surface opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      {tooltip}
    </div>
  </div>
);

interface DashboardProps {
  summary: DashboardSummary;
  /** Wired up to the Project Detail screen (Tarea 4.3/4.4). */
  onSelectProject?: (projectKey: string) => void;
  /** Re-runs `runAnalysis` and refreshes this screen in place (Tarea 4.4). */
  onRerunAnalysis?: () => void;
  isRerunning?: boolean;
}

const TopAttentionItem: React.FC<{ project: DashboardProjectRow }> = ({ project }) => (
  <li>
    {project.projectName} — {project.healthScore}
    {project.status && (
      <>
        {' '}
        <StatusBadge status={project.status} />
      </>
    )}
  </li>
);

// Status dot next to the score (Tarea C.2, code.html rows): same semantic
// colors as StatusBadge/HEALTH_BAR_ROWS, just a smaller unlabeled dot.
const STATUS_DOT_CLASS: Record<HealthStatus, string> = {
  HEALTHY: 'bg-status-healthy',
  AT_RISK: 'bg-status-at-risk',
  CRITICAL: 'bg-status-critical',
};

const ProjectRow: React.FC<{
  project: DashboardProjectRow;
  isEven: boolean;
  onSelectProject?: (projectKey: string) => void;
}> = ({ project, isEven, onSelectProject }) => (
  <tr
    className={`group transition-colors hover:bg-surface-container-low ${isEven ? 'bg-surface-slate/30' : ''} ${
      onSelectProject ? 'cursor-pointer' : ''
    }`}
  >
    <td className="p-4">
      {onSelectProject ? (
        <button
          type="button"
          onClick={() => onSelectProject(project.projectKey)}
          className="font-label-bold text-label-bold text-text-heading transition-colors group-hover:text-primary"
        >
          {project.projectName}
        </button>
      ) : (
        <span className="font-label-bold text-label-bold text-text-heading">{project.projectName}</span>
      )}
      {project.alertCount > 0 && (
        <span
          className="ml-1 text-status-critical"
          title={`${project.alertCount} alert${project.alertCount === 1 ? '' : 's'}`}
        >
          ⚠
        </span>
      )}
      <div className="font-body-sm text-body-sm text-on-surface-variant">{project.projectKey}</div>
    </td>
    <td className="p-4 text-right">
      {project.healthScore !== null && project.status ? (
        <div className="flex items-center justify-end gap-2">
          <div className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASS[project.status]}`} />
          <span className="font-data-mono text-data-mono font-bold text-text-heading">{project.healthScore}</span>
        </div>
      ) : (
        <span className="font-data-mono text-data-mono text-on-surface-variant">N/A</span>
      )}
    </td>
    <td className="p-4 text-center">
      <div className="inline-flex">
        <TrendBadge trend={project.trend} />
      </div>
    </td>
    <td className="p-4">
      {project.status ? (
        <StatusBadge status={project.status} />
      ) : project.reasonKind === 'failed' ? (
        <span className="font-body-sm text-body-sm text-status-critical">Analysis unavailable — {project.reason}</span>
      ) : (
        <span className="font-body-sm text-body-sm text-on-surface-variant">{project.reason ?? 'N/A'}</span>
      )}
    </td>
  </tr>
);

export const Dashboard: React.FC<DashboardProps> = ({
  summary,
  onSelectProject,
  onRerunAnalysis,
  isRerunning,
}) => {
  const { overallHealth, statusCounts, projects, topAttention, alerts } = summary;
  const scoredTotal = statusCounts.critical + statusCounts.atRisk + statusCounts.healthy;

  return (
    <section className="flex flex-col gap-gutter">
      <div className="flex items-end justify-between">
        <h1 className="font-headline-lg text-headline-lg text-text-heading">Portfolio Health</h1>

        {onRerunAnalysis && (
          <button
            type="button"
            onClick={onRerunAnalysis}
            disabled={isRerunning}
            className="font-label-bold text-label-bold text-primary transition-colors hover:text-primary-container disabled:opacity-50"
          >
            {isRerunning ? 'Re-running analysis...' : 'Re-run analysis'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <section className="relative flex flex-col items-center gap-8 overflow-hidden rounded-xl border border-outline-variant bg-surface p-6 shadow-sm md:flex-row md:items-center md:justify-between lg:col-span-8">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-fixed/30 opacity-50 blur-3xl"
            aria-hidden="true"
          />
          <div className="z-10 flex flex-col items-center md:items-start">
            <h2 className="mb-stack-sm font-headline-sm text-headline-sm uppercase text-text-heading">
              Overall Portfolio Health
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="font-display-hero text-display-hero text-text-heading">
                {overallHealth ?? 'N/A'}
              </span>
              {overallHealth !== null && (
                <span className="font-headline-lg text-headline-lg text-outline">/100</span>
              )}
            </div>
            <p className="mt-2 rounded bg-surface-container-high px-2 py-1 font-body-sm text-body-sm text-on-surface-variant">
              Score based on schedule, delivery, scope, capacity, and dependency health.
            </p>
          </div>
          <div className="z-10 w-full flex-1 md:w-auto">
            <div className="flex w-full flex-col gap-3">
              {HEALTH_BAR_ROWS.map((row) => (
                <HealthStatusBar
                  key={row.key}
                  label={row.label}
                  dotClass={row.dotClass}
                  barClass={row.barClass}
                  count={statusCounts[row.key]}
                  total={scoredTotal}
                  tooltip={row.tooltip}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      <section>
        <h2>Alerts</h2>
        {alerts.length === 0 ? (
          <p>No alerts.</p>
        ) : (
          <ul>
            {alerts.map((alert, index) => (
              <li key={`${alert.projectKey}-${alert.code}-${alert.date}-${index}`}>
                <strong>{alert.projectName}</strong>: {alert.message} ({alert.date})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Top Attention</h2>
        {topAttention.length === 0 ? (
          <p>No projects with a calculated health score yet.</p>
        ) : (
          <ol>
            {topAttention.map((project) => (
              <TopAttentionItem key={project.projectKey} project={project} />
            ))}
          </ol>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        <div className="border-b border-outline-variant bg-surface-slate p-4">
          <h2 className="font-headline-sm text-headline-sm uppercase text-text-heading">Health by Project</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface">
                <th className="p-4 font-headline-sm text-headline-sm uppercase text-on-surface-variant">Project</th>
                <th className="p-4 text-right font-headline-sm text-headline-sm uppercase text-on-surface-variant">
                  Health
                </th>
                <th className="p-4 text-center font-headline-sm text-headline-sm uppercase text-on-surface-variant">
                  Trend
                </th>
                <th className="p-4 font-headline-sm text-headline-sm uppercase text-on-surface-variant">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {projects.map((project, index) => (
                <ProjectRow
                  key={project.projectKey}
                  project={project}
                  isEven={index % 2 === 1}
                  onSelectProject={onSelectProject}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};
