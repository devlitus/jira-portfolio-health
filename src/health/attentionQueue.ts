// Attention Queue (Tarea 4.2, §18). Pure function that turns the selected
// projects plus their latest cached analysis (same input shape as the
// Portfolio overview, Tarea 4.1) into the ordered "Today's Attention" queue:
//
//   severity DESC, then health score ASC, then recent deterioration DESC
//
// Deterioration (Tarea 5.4) is precomputed by the resolver from snapshot
// history, same as `trend`/`trendLine` (Tarea 5.3) — see `DashboardEntry`.

import { HealthFactor, HealthStatus } from '../metrics/model';
import { DashboardEntry } from './dashboard';
import { ProjectAnalysisSuccess } from './analyzeProject';
import { formatDeterioration } from './trend';

const SEVERITY_RANK: Record<HealthStatus, number> = {
  CRITICAL: 0,
  AT_RISK: 1,
  HEALTHY: 2,
};

export interface AttentionQueueEntry {
  projectKey: string;
  projectName: string;
  healthScore: number;
  status: HealthStatus;
  /** Health score change over the last 14 days (§18); negative means the project got worse. Null when there's no ~14-day-old snapshot to compare against. */
  deterioration: number | null;
  /** Formatted deterioration line (§18: "↓ -19 in 14 days"); null when `deterioration` is null. */
  deteriorationLabel: string | null;
  /** The explainable factor with the largest penalty across all dimensions, if any (§18 "Main issue"). */
  mainIssue: string | null;
}

type ScoredEntry = DashboardEntry & {
  outcome: ProjectAnalysisSuccess & { healthScore: number; status: HealthStatus };
};

function isScored(entry: DashboardEntry): entry is ScoredEntry {
  return !!entry.outcome && entry.outcome.ok && entry.outcome.status !== null;
}

function findMainIssue(dimensions: ProjectAnalysisSuccess['dimensions']): string | null {
  const allFactors: HealthFactor[] = Object.values(dimensions).flatMap((dimension) => dimension.factors);
  if (allFactors.length === 0) return null;

  return allFactors.reduce((worst, factor) => (factor.impact < worst.impact ? factor : worst)).message;
}

function toEntry({ project, outcome, deterioration }: ScoredEntry): AttentionQueueEntry {
  const resolvedDeterioration = deterioration ?? null;
  return {
    projectKey: project.key,
    projectName: project.name,
    healthScore: outcome.healthScore,
    status: outcome.status,
    deterioration: resolvedDeterioration,
    deteriorationLabel: formatDeterioration(resolvedDeterioration),
    mainIssue: findMainIssue(outcome.dimensions),
  };
}

/**
 * Builds the Attention Queue (§18) from the selected projects and their
 * latest cached analysis. Only scored projects appear — a project with no
 * analysis yet or a failed run has no severity/health to triage and is
 * already surfaced as an error/empty state elsewhere (Tarea 4.1).
 */
export function buildAttentionQueue(entries: DashboardEntry[]): AttentionQueueEntry[] {
  return entries
    .filter(isScored)
    .map(toEntry)
    .sort((a, b) => {
      const severityDiff = SEVERITY_RANK[a.status] - SEVERITY_RANK[b.status];
      if (severityDiff !== 0) return severityDiff;

      const healthDiff = a.healthScore - b.healthScore;
      if (healthDiff !== 0) return healthDiff;

      // "recent deterioration DESC" (§18): the biggest recent drop goes first.
      // `deterioration` is negative when a project got worse (Tarea 5.4), so
      // that's ascending order on the signed value, not descending. Unknown
      // deterioration (no ~14-day-old snapshot) sorts as if unchanged — missing
      // history isn't evidence of decline (§24 Resilience).
      return (a.deterioration ?? 0) - (b.deterioration ?? 0);
    });
}
