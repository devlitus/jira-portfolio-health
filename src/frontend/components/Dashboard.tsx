// Portfolio overview (Tarea 4.1, §7, §26): executive header, Alerts (§20,
// Tarea 6.1.d), Top Attention and the Health by Project table (with a "⚠"
// badge on rows that have stored alerts). Reads the resolver's
// already-reduced summary (src/health/dashboard.ts) — no computation here,
// just rendering.
import React from 'react';
import type { DashboardProjectRow, DashboardStatusCounts, DashboardSummary, PortfolioAlert } from '../../health/dashboard';
import type { HealthStatus } from '../../metrics/model';
import { StatusBadge } from './ui/StatusBadge';
import { TrendBadge } from './ui/TrendBadge';
import { CheckIcon, NotificationsIcon, WarningIcon } from './ui/icons';

// Hero: "Overall health" + 3 status-count cards (Tarea C.1), reemplazando la
// card ancha con barras proporcionales del diseño anterior (Adaptación 8: sin
// sparkline — no hay serie histórica de overallHealth). Literal class strings
// (no interpolación de template) para que el scanner estático de Tailwind las
// detecte — mismo patrón que STATUS_DOT_CLASS/AlertRow.
const STATUS_COUNT_CARDS: {
  key: keyof DashboardStatusCounts;
  label: string;
  borderClass: string;
  iconClass: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'critical',
    label: 'Critical',
    borderClass: 'border-l-4 border-status-critical',
    iconClass: 'text-status-critical',
    icon: <WarningIcon size={22} />,
  },
  {
    key: 'atRisk',
    label: 'At Risk',
    borderClass: 'border-l-4 border-status-at-risk',
    iconClass: 'text-status-at-risk',
    icon: <WarningIcon size={22} />,
  },
  {
    key: 'healthy',
    label: 'Healthy',
    borderClass: 'border-l-4 border-status-healthy',
    iconClass: 'text-status-healthy',
    icon: <CheckIcon size={22} />,
  },
];

const OverallHealthCard: React.FC<{ overallHealth: number | null }> = ({ overallHealth }) => (
  <section className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm">
    <h2 className="font-headline-sm text-headline-sm uppercase text-on-surface-variant">Overall health</h2>
    <div className="mt-2 flex items-baseline gap-2">
      <span className="font-display-hero text-display-hero text-text-heading">{overallHealth ?? 'N/A'}</span>
      {overallHealth !== null && <span className="font-headline-lg text-headline-lg text-outline">/100</span>}
    </div>
    <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
      Score based on schedule, delivery, scope, capacity, and dependency health.
    </p>
  </section>
);

const StatCountCard: React.FC<{
  label: string;
  count: number;
  borderClass: string;
  iconClass: string;
  icon: React.ReactNode;
}> = ({ label, count, borderClass, iconClass, icon }) => (
  <section
    className={`flex items-center justify-between rounded-xl border border-outline-variant bg-surface p-6 shadow-sm ${borderClass}`}
  >
    <div>
      <h2 className="font-headline-sm text-headline-sm uppercase text-on-surface-variant">{label}</h2>
      <span className="font-display-hero text-display-hero text-text-heading">{count}</span>
    </div>
    <span className={iconClass}>{icon}</span>
  </section>
);

interface DashboardProps {
  summary: DashboardSummary;
  /** Wired up to the Project Detail screen (Tarea 4.3/4.4). */
  onSelectProject?: (projectKey: string) => void;
  /** Re-runs `runAnalysis` and refreshes this screen in place (Tarea 4.4). */
  onRerunAnalysis?: () => void;
  isRerunning?: boolean;
}

// Recent Alerts row (Tarea C.3, Adaptación 7): mismo lenguaje visual que las
// "Actionable Cards" de DESIGN.md (borde-acento izquierdo de 4px por
// severidad) — todas las alertas del §20 son eventos negativos, así que usan
// el color crítico en vez de variar por status.
const AlertRow: React.FC<{ alert: PortfolioAlert }> = ({ alert }) => (
  <li className="flex items-start gap-3 border-l-4 border-status-critical bg-surface p-4">
    <WarningIcon size={16} className="mt-0.5 shrink-0 text-status-critical" />
    <div className="min-w-0 flex-1">
      <span className="font-label-bold text-label-bold text-text-heading">{alert.projectName}</span>{' '}
      <span className="font-body-sm text-body-sm text-on-surface-variant">{alert.message}</span>
    </div>
    <span className="shrink-0 font-data-mono text-data-mono text-on-surface-variant">{alert.date}</span>
  </li>
);

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

      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
        <OverallHealthCard overallHealth={overallHealth} />
        {STATUS_COUNT_CARDS.map((card) => (
          <StatCountCard
            key={card.key}
            label={card.label}
            count={statusCounts[card.key]}
            borderClass={card.borderClass}
            iconClass={card.iconClass}
            icon={card.icon}
          />
        ))}
      </div>

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

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm lg:col-span-12">
        <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-slate p-4">
          <NotificationsIcon size={18} className="text-on-surface-variant" />
          <h2 className="font-headline-sm text-headline-sm uppercase text-text-heading">Recent Alerts</h2>
        </div>
        {alerts.length === 0 ? (
          <p className="p-6 text-center font-body-sm text-body-sm text-on-surface-variant">
            No recent alerts.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant/50">
            {alerts.map((alert, index) => (
              <AlertRow key={`${alert.projectKey}-${alert.code}-${alert.date}-${index}`} alert={alert} />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
};
