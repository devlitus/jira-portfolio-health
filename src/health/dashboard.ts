// Portfolio overview (Tarea 4.1, §7, §26). Pure function that turns the
// selected projects plus their latest cached analysis (KVS `latest:<key>`,
// Tarea 3.5) into the three pieces of the dashboard's executive view:
// overall health, status counts, and the "Health by Project" rows (with a
// "Top Attention" slice of the worst 3). No I/O here — the resolver
// (src/index.ts) is the only thing that touches KVS/Jira.

import { HealthStatus, Project } from '../metrics/model';
import { ProjectAnalysisOutcome } from './analyzeProject';
import { TREND_PLACEHOLDER } from './trend';
import { Alert } from './alerts';

const TOP_ATTENTION_SIZE = 3;
/** Cap on the dashboard's Alerts section (Tarea 6.1.d) — most recent first. */
const ALERTS_PANEL_SIZE = 10;
const NO_ANALYSIS_REASON = 'No analysis yet — run analysis to see this project.';
const INSUFFICIENT_DATA_REASON = 'N/A — Insufficient data';

/** An alert (§20) tagged with the project name for the dashboard's Alerts section. */
export interface PortfolioAlert extends Alert {
  projectName: string;
}

/**
 * Why a row has no score (Tarea 6.2, §26 empty/error states) — lets the
 * frontend render a distinct headline per case ("Analysis unavailable" for a
 * failed run, "N/A — Insufficient data" when the run succeeded but the
 * project simply has no computable signal, §24 "don't penalize missing
 * data") instead of a single generic "N/A".
 */
export type UnscoredReason = 'no-analysis' | 'failed' | 'insufficient-data';

export interface DashboardProjectRow {
  projectKey: string;
  projectName: string;
  healthScore: number | null;
  status: HealthStatus | null;
  trend: string;
  /** Present when there's no score to show (analysis failed, never ran, or ran but found nothing to score). */
  reason?: string;
  /** Categorizes `reason` for the frontend (Tarea 6.2); absent when the row has a score. */
  reasonKind?: UnscoredReason;
  /** Number of stored alerts (§20, Tarea 6.1) for this project — drives the dashboard's badge (Tarea 6.1.d). */
  alertCount: number;
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
  /** Most recent stored alerts (§20, Tarea 6.1.d) across the selected projects, newest first. */
  alerts: PortfolioAlert[];
}

export interface DashboardEntry {
  project: Project;
  /** The cached `latest:<projectKey>` outcome, or undefined if none exists yet. */
  outcome: ProjectAnalysisOutcome | undefined;
  /** Dashboard Trend column (↑/↓/→, Tarea 5.3), precomputed by the resolver from snapshot history. Defaults to the placeholder when omitted (e.g. in tests that don't care about trend). */
  trend?: string;
  /** Project Detail trend line (§16, Tarea 5.3), precomputed by the resolver from snapshot history. */
  trendLine?: string;
  /** Health score change over the last 14 days (§18, Tarea 5.4), precomputed by the resolver from snapshot history. Null/undefined when there's no ~14-day-old snapshot to compare against. */
  deterioration?: number | null;
  /** Stored alerts (§20, Tarea 6.1), precomputed by the resolver from the alert store. Defaults to none when omitted (e.g. in tests that don't care about alerts). */
  alerts?: Alert[];
}

function toRow({ project, outcome, trend, alerts }: DashboardEntry): DashboardProjectRow {
  const base = {
    projectKey: project.key,
    projectName: project.name,
    trend: trend ?? TREND_PLACEHOLDER,
    alertCount: alerts?.length ?? 0,
  };

  if (!outcome) {
    return { ...base, healthScore: null, status: null, reason: NO_ANALYSIS_REASON, reasonKind: 'no-analysis' };
  }

  if (!outcome.ok) {
    return { ...base, healthScore: null, status: null, reason: outcome.reason, reasonKind: 'failed' };
  }

  if (outcome.healthScore === null) {
    // The run succeeded but every dimension came back null (e.g. no issues
    // to analyze yet) — not a failure, just nothing to score (§24 Resilience:
    // never treat missing data as a penalty).
    return {
      ...base,
      healthScore: null,
      status: null,
      reason: INSUFFICIENT_DATA_REASON,
      reasonKind: 'insufficient-data',
    };
  }

  return { ...base, healthScore: outcome.healthScore, status: outcome.status };
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

  const alerts = entries
    .flatMap(({ project, alerts: projectAlerts }) =>
      (projectAlerts ?? []).map((alert) => ({ ...alert, projectName: project.name }))
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, ALERTS_PANEL_SIZE);

  return { overallHealth, statusCounts, projects, topAttention, alerts };
}
