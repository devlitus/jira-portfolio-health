// Dimension scores with explainable factors (§9-§13, §15). Pure functions,
// no I/O (§23) — turn each dimension's raw metrics (Fase 2) into a
// `DimensionResult` (score 0-100 + HealthFactor[]). Per the spec's own
// wording (§9 "No es necesario crear una fórmula matemáticamente perfecta"),
// scores use simple, documented tiers rather than a precise formula — what
// matters is that they're consistent, explainable, and adjustable later.
//
// Missing-data invariant (CLAUDE.md / §24 Resilience): whenever the raw
// metrics can't support a judgment (null inputs, no signal to measure),
// the dimension score is `null` with no factors — never a fabricated 0/100.

import { ScheduleMetrics } from '../metrics/schedule';
import { DeliveryMetrics } from '../metrics/delivery';
import { ScopeMetrics } from '../metrics/scope';
import { CapacityMetrics, CapacityMetricsUnavailable } from '../metrics/capacity';
import { DependenciesMetrics } from '../metrics/dependencies';
import { DimensionResult, HealthFactor } from '../metrics/model';

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ---------------------------------------------------------------------------
// 3.2.a — Schedule score (§9)
// ---------------------------------------------------------------------------

/** overdueRatio tiers mapped to the spec's illustrative scale (100/80/60/40/20). */
const OVERDUE_RATIO_TIERS: ReadonlyArray<{ maxRatio: number; impact: number }> = [
  { maxRatio: 0.1, impact: -20 },
  { maxRatio: 0.25, impact: -40 },
  { maxRatio: 0.5, impact: -60 },
  { maxRatio: Infinity, impact: -80 },
];

/** "Completion estancada": progress has stalled while overdue issues pile up. */
const STALLED_COMPLETION_RATIO_THRESHOLD = 0.1;
const STALLED_COMPLETION_IMPACT = -10;

function overdueImpact(ratio: number): number {
  const tier = OVERDUE_RATIO_TIERS.find((t) => ratio <= t.maxRatio);
  return (tier ?? OVERDUE_RATIO_TIERS[OVERDUE_RATIO_TIERS.length - 1]).impact;
}

/**
 * §9. `overdueRatio === null` means no issue in the project has a due date —
 * there's no schedule signal at all, so the dimension is `null` rather than
 * a false "100".
 */
export function computeScheduleScore(metrics: ScheduleMetrics | null): DimensionResult {
  if (metrics === null || metrics.overdueRatio === null) {
    return { score: null, factors: [] };
  }

  const { overdueRatio, completionRatio, overdueIssuesCount } = metrics;
  const factors: HealthFactor[] = [];
  let score = 100;

  if (overdueRatio > 0) {
    const impact = overdueImpact(overdueRatio);
    score += impact;
    factors.push({
      code: 'OVERDUE_ISSUES',
      impact,
      message: `${overdueIssuesCount} issue${overdueIssuesCount === 1 ? '' : 's'} ${
        overdueIssuesCount === 1 ? 'is' : 'are'
      } overdue`,
    });
  }

  if (
    overdueIssuesCount > 0 &&
    completionRatio !== null &&
    completionRatio < STALLED_COMPLETION_RATIO_THRESHOLD
  ) {
    score += STALLED_COMPLETION_IMPACT;
    factors.push({
      code: 'STALLED_COMPLETION',
      impact: STALLED_COMPLETION_IMPACT,
      message: `Only ${Math.round(completionRatio * 100)}% of issues are done while overdue issues exist`,
    });
  }

  return { score: clampScore(score), factors };
}

// ---------------------------------------------------------------------------
// 3.2.b — Delivery score (§10)
// ---------------------------------------------------------------------------

const THROUGHPUT_DECLINE_THRESHOLD_PERCENT = -20;
const THROUGHPUT_DECLINE_IMPACT = -20;
const REOPENED_RATIO_THRESHOLD = 0.15;
const REOPENED_IMPACT = -10;
const AGED_IN_PROGRESS_THRESHOLD_DAYS = 14;
const AGED_IN_PROGRESS_IMPACT = -10;

/**
 * §10. When the project has never had a completed or in-progress issue,
 * there's no delivery activity to judge — `null` rather than a false "100".
 */
export function computeDeliveryScore(metrics: DeliveryMetrics | null): DimensionResult {
  if (metrics === null) return { score: null, factors: [] };

  const {
    throughputTrendPercent,
    reopenedRatio,
    reopenedCount,
    completedIssuesCount,
    averageInProgressAgeDays,
    inProgressIssuesCount,
    inProgressIssuesWithAgeCount,
  } = metrics;

  if (completedIssuesCount === 0 && inProgressIssuesCount === 0) {
    return { score: null, factors: [] };
  }

  const factors: HealthFactor[] = [];
  let score = 100;

  if (
    throughputTrendPercent !== null &&
    throughputTrendPercent < THROUGHPUT_DECLINE_THRESHOLD_PERCENT
  ) {
    score += THROUGHPUT_DECLINE_IMPACT;
    factors.push({
      code: 'THROUGHPUT_DECLINING',
      impact: THROUGHPUT_DECLINE_IMPACT,
      message: `Weekly throughput dropped ${Math.round(
        Math.abs(throughputTrendPercent)
      )}% versus the prior period`,
    });
  }

  if (reopenedRatio !== null && reopenedRatio > REOPENED_RATIO_THRESHOLD) {
    score += REOPENED_IMPACT;
    factors.push({
      code: 'REOPENED_ISSUES',
      impact: REOPENED_IMPACT,
      message: `${reopenedCount} issue${reopenedCount === 1 ? '' : 's'} reopened after being marked done`,
    });
  }

  if (
    averageInProgressAgeDays !== null &&
    inProgressIssuesWithAgeCount > 0 &&
    averageInProgressAgeDays > AGED_IN_PROGRESS_THRESHOLD_DAYS
  ) {
    score += AGED_IN_PROGRESS_IMPACT;
    factors.push({
      code: 'AGED_IN_PROGRESS_ISSUES',
      impact: AGED_IN_PROGRESS_IMPACT,
      message: `In-progress issues have been active for ${Math.round(
        averageInProgressAgeDays
      )} days on average`,
    });
  }

  return { score: clampScore(score), factors };
}

// ---------------------------------------------------------------------------
// 3.2.c — Scope score (§11)
// ---------------------------------------------------------------------------

/** §11 interpretation bands: 0-5% Healthy, 5-15% Warning, 15-25% Risk, >25% Critical. */
const SCOPE_GROWTH_HEALTHY_MAX_PERCENT = 5;
const SCOPE_GROWTH_WARNING_MAX_PERCENT = 15;
const SCOPE_GROWTH_RISK_MAX_PERCENT = 25;

/** §11. `scopeGrowthPercent === null` means there's no baseline yet — nothing to compare against. */
export function computeScopeScore(metrics: ScopeMetrics | null): DimensionResult {
  if (metrics === null || metrics.scopeGrowthPercent === null) {
    return { score: null, factors: [] };
  }

  const { scopeGrowthPercent } = metrics;

  if (scopeGrowthPercent <= SCOPE_GROWTH_HEALTHY_MAX_PERCENT) {
    return { score: 100, factors: [] };
  }

  let score: number;
  let impact: number;
  if (scopeGrowthPercent <= SCOPE_GROWTH_WARNING_MAX_PERCENT) {
    score = 75;
    impact = -25;
  } else if (scopeGrowthPercent <= SCOPE_GROWTH_RISK_MAX_PERCENT) {
    score = 50;
    impact = -50;
  } else {
    score = 25;
    impact = -75;
  }

  return {
    score,
    factors: [
      {
        code: 'SCOPE_GROWTH',
        impact,
        message: `Current scope is ${Math.round(scopeGrowthPercent)}% larger than the initial baseline`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 3.2.d — Capacity score (§12)
// ---------------------------------------------------------------------------

const CAPACITY_OVERLOAD_SCORE = 40;
const CAPACITY_OVERLOAD_IMPACT = -60;

/**
 * §12. `ok: false` is the metrics layer's own "not enough workload data"
 * signal (Tarea 2.4) — propagated here as `null`, per §12 "No inventar datos".
 */
export function computeCapacityScore(
  metrics: CapacityMetrics | CapacityMetricsUnavailable | null
): DimensionResult {
  if (metrics === null || metrics.ok === false) {
    return { score: null, factors: [] };
  }

  if (metrics.workloadSignal !== 'HIGH') {
    return { score: 100, factors: [] };
  }

  return {
    score: CAPACITY_OVERLOAD_SCORE,
    factors: [
      {
        code: 'CAPACITY_OVERLOAD',
        impact: CAPACITY_OVERLOAD_IMPACT,
        message: `Workload is significantly above the normal WIP level (max ${
          metrics.maxWipPerUser
        } vs avg ${metrics.averageWipPerUser.toFixed(1)} per user)`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 3.2.e — Dependencies score (§13)
// ---------------------------------------------------------------------------

const BLOCKED_ISSUE_PENALTY = 8;
const AGED_BLOCKER_PENALTY = 12;
const EXTERNAL_DEPENDENCY_PENALTY = 5;
const MAX_EXTERNAL_DEPENDENCY_IMPACT = -15;

/** §13. `blockedCount === 0` means no active blockers — nothing to penalize. */
export function computeDependenciesScore(metrics: DependenciesMetrics | null): DimensionResult {
  if (metrics === null) return { score: null, factors: [] };

  const { blockedCount, agedBlockedCount, dependentProjectCount } = metrics;

  if (blockedCount === 0) {
    return { score: 100, factors: [] };
  }

  const factors: HealthFactor[] = [];
  let score = 100;

  const blockedImpact = -(blockedCount * BLOCKED_ISSUE_PENALTY);
  score += blockedImpact;
  factors.push({
    code: 'BLOCKED_ISSUES',
    impact: blockedImpact,
    message: `${blockedCount} issue${blockedCount === 1 ? '' : 's'} blocked by unresolved dependencies`,
  });

  if (agedBlockedCount > 0) {
    const agedImpact = -(agedBlockedCount * AGED_BLOCKER_PENALTY);
    score += agedImpact;
    factors.push({
      code: 'AGED_BLOCKERS',
      impact: agedImpact,
      message: `${agedBlockedCount} blocker${agedBlockedCount === 1 ? '' : 's'} have been open for more than 5 days`,
    });
  }

  if (dependentProjectCount > 0) {
    const externalImpact = Math.max(
      -(dependentProjectCount * EXTERNAL_DEPENDENCY_PENALTY),
      MAX_EXTERNAL_DEPENDENCY_IMPACT
    );
    score += externalImpact;
    factors.push({
      code: 'EXTERNAL_DEPENDENCIES',
      impact: externalImpact,
      message: `${dependentProjectCount} cross-project dependenc${
        dependentProjectCount === 1 ? 'y' : 'ies'
      } detected`,
    });
  }

  return { score: clampScore(score), factors };
}
