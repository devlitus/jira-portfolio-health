// Attention Queue (Tarea 4.2, §18). Pure function that turns the selected
// projects plus their latest cached analysis (same input shape as the
// Portfolio overview, Tarea 4.1) into the ordered "Today's Attention" queue:
//
//   severity DESC, then health score ASC, then recent deterioration DESC
//
// Deterioration requires historical snapshots (Fase 5, Tarea 5.4) and is
// stubbed at 0 for every entry until then, per the plan's own note on this
// task — the ordering rule itself is already fully wired, so Tarea 5.4 only
// needs to supply a real value.

import { HealthFactor, HealthStatus } from '../metrics/model';
import { DashboardEntry } from './dashboard';
import { ProjectAnalysisSuccess } from './analyzeProject';

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
  /** Health score change over the last 14 days; stubbed at 0 until Fase 5 (Tarea 5.4). */
  deterioration: number;
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

function toEntry({ project, outcome }: ScoredEntry): AttentionQueueEntry {
  return {
    projectKey: project.key,
    projectName: project.name,
    healthScore: outcome.healthScore,
    status: outcome.status,
    deterioration: 0,
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

      return b.deterioration - a.deterioration;
    });
}
