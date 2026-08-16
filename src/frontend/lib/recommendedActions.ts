// Recommended Actions aggregation (Tarea D.1, Fase D). Pure function that
// flattens each monitored project's already-computed recommendations
// (src/health/recommendations.ts, reached via the getProjectDetail resolver)
// into a single portfolio-wide list. Recommendation itself carries no
// severity (Tarea 3.4), so each item's severity is derived here from the
// matching HealthFactor's impact using the Adaptación 4 thresholds. No I/O —
// index.tsx supplies the ProjectDetail[] it already fetched via invoke.

import type { ProjectDetail as ProjectDetailData } from '../../health/projectDetail';
import type { HealthFactor, HealthStatus } from '../../metrics/model';

export interface RecommendedActionItem {
  projectKey: string;
  projectName: string;
  code: string;
  message: string;
  severity: HealthStatus;
  ruleLabel: string;
}

/** Adaptación 3 — the 4 rule codes' conditions, already coded in recommendations.ts RULES, given readable form. */
const RULE_LABELS: Record<string, string> = {
  SCOPE_GROWTH: 'SCOPE GROWTH > 20%',
  BLOCKED_ISSUES: 'BLOCKED ISSUES ≥ 3',
  OVERDUE_ISSUES: 'OVERDUE RATIO > 0.20',
  CAPACITY_OVERLOAD: 'WORKLOAD SIGNAL = HIGH',
};

/** Adaptación 4 — severity from the matching factor's |impact|; no factor found means never fabricate a high severity. */
function severityFor(code: string, factors: HealthFactor[]): HealthStatus {
  const factor = factors.find((candidate) => candidate.code === code);
  if (!factor) return 'HEALTHY';

  const points = Math.abs(factor.impact);
  if (points >= 40) return 'CRITICAL';
  if (points >= 20) return 'AT_RISK';
  return 'HEALTHY';
}

/**
 * Aggregates every monitored project's recommendations (Recommendation
 * Engine output, already capped at 3 per project) into one portfolio-wide
 * list, worst project first (null health scores last), preserving each
 * project's own impact-ordered recommendations.
 */
export function buildRecommendedActions(details: ProjectDetailData[]): RecommendedActionItem[] {
  const orderedDetails = [...details].sort((a, b) => {
    if (a.healthScore === null) return b.healthScore === null ? 0 : 1;
    if (b.healthScore === null) return -1;
    return a.healthScore - b.healthScore;
  });

  return orderedDetails.flatMap((detail) =>
    detail.recommendations.map((recommendation) => ({
      projectKey: detail.projectKey,
      projectName: detail.projectName,
      code: recommendation.code,
      message: recommendation.message,
      severity: severityFor(recommendation.code, detail.factors),
      ruleLabel: RULE_LABELS[recommendation.code] ?? recommendation.code,
    }))
  );
}
