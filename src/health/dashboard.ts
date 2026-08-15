// Portfolio overview (Tarea 4.1, §7, §26). Pure function that turns the
// selected projects plus their latest cached analysis (KVS `latest:<key>`,
// Tarea 3.5) into the three pieces of the dashboard's executive view:
// overall health, status counts, and the "Health by Project" rows (with a
// "Top Attention" slice of the worst 3). No I/O here — the resolver
// (src/index.ts) is the only thing that touches KVS/Jira.

import { HealthStatus, Project } from '../metrics/model';
import { ProjectAnalysisOutcome } from './analyzeProject';
import { TREND_PLACEHOLDER } from './trend';

const TOP_ATTENTION_SIZE = 3;
const NO_ANALYSIS_REASON = 'No analysis yet — run analysis to see this project.';

export interface DashboardProjectRow {
  projectKey: string;
  projectName: string;
  healthScore: number | null;
  status: HealthStatus | null;
  trend: string;
  /** Present when there's no score to show (analysis failed or never ran). */
  reason?: string;
}

export interface DashboardStatusCounts {
  healthy: number;
  atRisk: number;
  critical: number;
}

export interface DashboardSummary {
  /** Average health score across projects with a score; null if none do. */
  overallHealth: number | null;
  statusCounts: DashboardStatusCounts;
  projects: DashboardProjectRow[];
  /** The worst `TOP_ATTENTION_SIZE` scored projects, ascending by health. */
  topAttention: DashboardProjectRow[];
}

export interface DashboardEntry {
  project: Project;
  /** The cached `latest:<projectKey>` outcome, or undefined if none exists yet. */
  outcome: ProjectAnalysisOutcome | undefined;
  /** Dashboard Trend column (↑/↓/→, Tarea 5.3), precomputed by the resolver from snapshot history. Defaults to the placeholder when omitted (e.g. in tests that don't care about trend). */
  trend?: string;
  /** Project Detail trend line (§16, Tarea 5.3), precomputed by the resolver from snapshot history. */
  trendLine?: string;
}

function toRow({ project, outcome, trend }: DashboardEntry): DashboardProjectRow {
  if (!outcome || !outcome.ok) {
    return {
      projectKey: project.key,
      projectName: project.name,
      healthScore: null,
      status: null,
      trend: trend ?? TREND_PLACEHOLDER,
      reason: outcome && !outcome.ok ? outcome.reason : NO_ANALYSIS_REASON,
    };
  }

  return {
    projectKey: project.key,
    projectName: project.name,
    healthScore: outcome.healthScore,
    status: outcome.status,
    trend: trend ?? TREND_PLACEHOLDER,
  };
}

/**
 * Builds the Portfolio overview (§7) from the selected projects and their
 * latest cached analysis. Preserves the caller's entry order for the "Health
 * by Project" table; `topAttention` is a separate, independently sorted view
 * (worst health first) per §7's example.
 */
export function buildDashboardSummary(entries: DashboardEntry[]): DashboardSummary {
  const projects = entries.map(toRow);

  const scored = projects.filter(
    (row): row is DashboardProjectRow & { healthScore: number } => row.healthScore !== null
  );

  const overallHealth =
    scored.length === 0
      ? null
      : Math.round(scored.reduce((sum, row) => sum + row.healthScore, 0) / scored.length);

  const statusCounts: DashboardStatusCounts = {
    healthy: projects.filter((row) => row.status === 'HEALTHY').length,
    atRisk: projects.filter((row) => row.status === 'AT_RISK').length,
    critical: projects.filter((row) => row.status === 'CRITICAL').length,
  };

  const topAttention = [...scored]
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, TOP_ATTENTION_SIZE);

  return { overallHealth, statusCounts, projects, topAttention };
}
