// Portfolio overview (Tarea 4.1, §7, §26): executive header, Top Attention
// and the Health by Project table. Reads the resolver's already-reduced
// summary (src/health/dashboard.ts) — no computation here, just rendering.
import React from 'react';
import type { DashboardProjectRow, DashboardSummary } from '../../health/dashboard';
import type { HealthStatus } from '../../metrics/model';

interface DashboardProps {
  summary: DashboardSummary;
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

const ProjectRow: React.FC<{ project: DashboardProjectRow }> = ({ project }) => (
  <tr>
    <td>{project.projectName}</td>
    <td>{project.healthScore ?? 'N/A'}</td>
    <td>{project.trend}</td>
    <td>{project.status ? <StatusBadge status={project.status} /> : project.reason ?? 'N/A'}</td>
  </tr>
);

export const Dashboard: React.FC<DashboardProps> = ({ summary }) => {
  const { overallHealth, statusCounts, projects, topAttention } = summary;

  return (
    <section>
      <h1>Portfolio Health</h1>

      <section>
        <h2>Overall Health</h2>
        <p>{overallHealth === null ? 'N/A' : `${overallHealth} / 100`}</p>
        <p>
          {statusCounts.critical} Critical · {statusCounts.atRisk} At Risk · {statusCounts.healthy} On Track
        </p>
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
              <ProjectRow key={project.projectKey} project={project} />
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
};
