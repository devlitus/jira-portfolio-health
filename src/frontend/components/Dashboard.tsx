// Portfolio overview (Tarea 4.1, §7, §26): executive header, Alerts (§20,
// Tarea 6.1.d), Top Attention and the Health by Project table (with a "⚠"
// badge on rows that have stored alerts). Reads the resolver's
// already-reduced summary (src/health/dashboard.ts) — no computation here,
// just rendering.
import React from 'react';
import type { DashboardProjectRow, DashboardSummary } from '../../health/dashboard';
import type { HealthStatus } from '../../metrics/model';

interface DashboardProps {
  summary: DashboardSummary;
  /** Wired up to the Project Detail screen (Tarea 4.3/4.4). */
  onSelectProject?: (projectKey: string) => void;
  /** Re-runs `runAnalysis` and refreshes this screen in place (Tarea 4.4). */
  onRerunAnalysis?: () => void;
  isRerunning?: boolean;
}

const STATUS_LABELS: Record<HealthStatus, string> = {
  HEALTHY: 'Healthy',
  AT_RISK: 'At Risk',
  CRITICAL: 'Critical',
};

const STATUS_COLORS: Record<HealthStatus, string> = {
  HEALTHY: '#00875A',
  AT_RISK: '#FF8B00',
  CRITICAL: '#DE350B',
};

const StatusBadge: React.FC<{ status: HealthStatus }> = ({ status }) => (
  <span style={{ color: STATUS_COLORS[status], fontWeight: 600 }}>{STATUS_LABELS[status]}</span>
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

const ProjectRow: React.FC<{
  project: DashboardProjectRow;
  onSelectProject?: (projectKey: string) => void;
}> = ({ project, onSelectProject }) => (
  <tr>
    <td>
      {onSelectProject ? (
        <button type="button" onClick={() => onSelectProject(project.projectKey)}>
          {project.projectName}
        </button>
      ) : (
        project.projectName
      )}
      {project.alertCount > 0 && (
        <span title={`${project.alertCount} alert${project.alertCount === 1 ? '' : 's'}`}> ⚠</span>
      )}
    </td>
    <td>{project.healthScore ?? 'N/A'}</td>
    <td>{project.trend}</td>
    <td>{project.status ? <StatusBadge status={project.status} /> : project.reason ?? 'N/A'}</td>
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
    <section>
      <h1>Portfolio Health</h1>

      {onRerunAnalysis && (
        <button type="button" onClick={onRerunAnalysis} disabled={isRerunning}>
          {isRerunning ? 'Re-running analysis...' : 'Re-run analysis'}
        </button>
      )}

      <section>
        <h2>Overall Health</h2>
        <p>{overallHealth === null ? 'N/A' : `${overallHealth} / 100`}</p>
        <p>
          {statusCounts.critical} Critical · {statusCounts.atRisk} At Risk · {statusCounts.healthy} On Track
        </p>
      </section>

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

      <section>
        <h2>Health by Project</h2>
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Health</th>
              <th>Trend</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <ProjectRow key={project.projectKey} project={project} onSelectProject={onSelectProject} />
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
};
