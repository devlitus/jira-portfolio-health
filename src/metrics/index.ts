// Metrics orchestrator (Tarea 2.6). Pure function, no I/O (§23) — groups the
// 5 dimension calculators (§9-§13) and guarantees the caller never sees an
// exception: a dimension whose computation fails unexpectedly falls back to
// `null` instead of aborting the other 4 (§24 Resilience), on top of the
// missing-data `null`s each dimension module already returns internally.

import { computeScheduleMetrics, ScheduleMetrics } from './schedule';
import { computeDeliveryMetrics, DeliveryMetrics } from './delivery';
import { computeScopeMetrics, ScopeMetrics } from './scope';
import { computeCapacityMetrics, CapacityMetrics, CapacityMetricsUnavailable } from './capacity';
import { computeDependenciesMetrics, DependenciesMetrics } from './dependencies';
import { NormalizedIssue } from './model';

export interface ProjectMetrics {
  schedule: ScheduleMetrics | null;
  delivery: DeliveryMetrics | null;
  scope: ScopeMetrics | null;
  capacity: CapacityMetrics | CapacityMetricsUnavailable | null;
  dependencies: DependenciesMetrics | null;
}

/** Runs a dimension calculator, swallowing any unexpected exception into `null`. */
function safeCompute<T>(compute: () => T): T | null {
  try {
    return compute();
  } catch {
    return null;
  }
}

/**
 * @param baselineScope - passed through to computeScopeMetrics (§11); null
 * when the project has no stored baseline yet (see Tarea 2.3/5.1.c).
 */
export function computeProjectMetrics(
  issues: NormalizedIssue[],
  projectKey: string,
  baselineScope: number | null,
  now: Date = new Date()
): ProjectMetrics {
  return {
    schedule: safeCompute(() => computeScheduleMetrics(issues, now)),
    delivery: safeCompute(() => computeDeliveryMetrics(issues, now)),
    scope: safeCompute(() => computeScopeMetrics(issues, baselineScope)),
    capacity: safeCompute(() => computeCapacityMetrics(issues)),
    dependencies: safeCompute(() => computeDependenciesMetrics(issues, projectKey, now)),
  };
}
