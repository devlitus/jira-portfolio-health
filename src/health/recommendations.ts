// Recommendation Engine (§17). Pure, data-driven rule table over the raw
// dimension metrics (Fase 2) — NO AI/ML, just documented thresholds so the
// output stays deterministic and explainable (§4.4).
//
// Ordering: each rule maps to the HealthFactor.code (Tarea 3.2) it overlaps
// with, so recommendations are sorted by that factor's impact (most negative
// first) — the same severity ranking already shown in the "Why?" section —
// rather than re-deriving a separate priority score.

import { ProjectMetrics } from '../metrics/index';
import { DimensionResult } from '../metrics/model';

export interface DimensionResults {
  schedule: DimensionResult;
  delivery: DimensionResult;
  scope: DimensionResult;
  capacity: DimensionResult;
  dependencies: DimensionResult;
}

export interface Recommendation {
  /** HealthFactor.code of the rule that triggered this recommendation. */
  code: string;
  message: string;
}

interface RecommendationRule {
  code: string;
  when: (metrics: ProjectMetrics) => boolean;
  message: string;
}

const MAX_RECOMMENDATIONS = 3;

const RULES: RecommendationRule[] = [
  {
    code: 'SCOPE_GROWTH',
    when: (metrics) => (metrics.scope?.scopeGrowthPercent ?? -Infinity) > 20,
    message: 'Review or remove low-priority scope.',
  },
  {
    code: 'BLOCKED_ISSUES',
    when: (metrics) => (metrics.dependencies?.blockedCount ?? 0) >= 3,
    message: 'Review the top blockers and assign owners.',
  },
  {
    code: 'OVERDUE_ISSUES',
    when: (metrics) => (metrics.schedule?.overdueRatio ?? -Infinity) > 0.2,
    message: 'Review project schedule and overdue work.',
  },
  {
    code: 'CAPACITY_OVERLOAD',
    when: (metrics) =>
      metrics.capacity !== null && metrics.capacity.ok && metrics.capacity.workloadSignal === 'HIGH',
    message: 'Review WIP and team allocation.',
  },
];

/**
 * Evaluates the §17 rule table against a project's raw metrics, orders the
 * triggered recommendations by the impact of the matching HealthFactor in
 * `dimensions` (Tarea 3.2's output for the same project), and caps the
 * result at the top 3. Returns an empty array when no rule fires (healthy
 * project) — never a fabricated recommendation.
 */
export function generateRecommendations(
  metrics: ProjectMetrics,
  dimensions: DimensionResults
): Recommendation[] {
  const allFactors = Object.values(dimensions).flatMap((dimension) => dimension.factors);

  return RULES.filter((rule) => rule.when(metrics))
    .map((rule) => ({
      code: rule.code,
      message: rule.message,
      impact: allFactors.find((factor) => factor.code === rule.code)?.impact ?? 0,
    }))
    .sort((a, b) => a.impact - b.impact)
    .slice(0, MAX_RECOMMENDATIONS)
    .map(({ code, message }) => ({ code, message }));
}
