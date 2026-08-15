import { generateRecommendations } from '../src/health/recommendations';
import {
  computeScheduleScore,
  computeDeliveryScore,
  computeScopeScore,
  computeCapacityScore,
  computeDependenciesScore,
} from '../src/health/dimensions';
import { ProjectMetrics } from '../src/metrics/index';
import { ScheduleMetrics } from '../src/metrics/schedule';
import { DeliveryMetrics } from '../src/metrics/delivery';
import { ScopeMetrics } from '../src/metrics/scope';
import { CapacityMetrics } from '../src/metrics/capacity';
import { DependenciesMetrics } from '../src/metrics/dependencies';

function scheduleMetrics(overrides: Partial<ScheduleMetrics> = {}): ScheduleMetrics {
  return {
    overdueRatio: 0,
    completionRatio: 0.5,
    totalIssues: 10,
    doneIssues: 5,
    issuesWithDueDateCount: 10,
    overdueIssuesCount: 0,
    missingDueDateCount: 0,
    ...overrides,
  };
}

function deliveryMetrics(overrides: Partial<DeliveryMetrics> = {}): DeliveryMetrics {
  return {
    weeklyThroughput: [2, 2, 2, 2, 2, 2],
    throughputTrendPercent: 0,
    reopenedRatio: 0,
    reopenedCount: 0,
    completedIssuesCount: 10,
    averageInProgressAgeDays: 3,
    inProgressIssuesCount: 2,
    inProgressIssuesWithAgeCount: 2,
    ...overrides,
  };
}

function scopeMetrics(overrides: Partial<ScopeMetrics> = {}): ScopeMetrics {
  return {
    currentScope: 10,
    scopeGrowthPercent: 0,
    ...overrides,
  };
}

function capacityMetrics(overrides: Partial<CapacityMetrics> = {}): CapacityMetrics {
  return {
    ok: true,
    wipByAssignee: { u1: 2, u2: 2 },
    averageWipPerUser: 2,
    maxWipPerUser: 2,
    activeUserCount: 2,
    workloadSignal: 'NORMAL',
    ...overrides,
  };
}

function dependenciesMetrics(overrides: Partial<DependenciesMetrics> = {}): DependenciesMetrics {
  return {
    blockedCount: 0,
    averageBlockedAgeDays: null,
    agedBlockedCount: 0,
    dependentProjectCount: 0,
    dependentProjectKeys: [],
    ...overrides,
  };
}

/** Healthy baseline: no rule should fire against this. */
function healthyMetrics(): ProjectMetrics {
  return {
    schedule: scheduleMetrics(),
    delivery: deliveryMetrics(),
    scope: scopeMetrics(),
    capacity: capacityMetrics(),
    dependencies: dependenciesMetrics(),
  };
}

/** Builds the DimensionResults from the same metrics via the real Tarea 3.2 scorers, so factor impacts used for ordering match production. */
function dimensionsFor(metrics: ProjectMetrics) {
  return {
    schedule: computeScheduleScore(metrics.schedule),
    delivery: computeDeliveryScore(metrics.delivery),
    scope: computeScopeScore(metrics.scope),
    capacity: computeCapacityScore(metrics.capacity),
    dependencies: computeDependenciesScore(metrics.dependencies),
  };
}

describe('generateRecommendations (§17)', () => {
  it('§30 healthy project: no rule fires, returns an empty list', () => {
    const metrics = healthyMetrics();
    const recommendations = generateRecommendations(metrics, dimensionsFor(metrics));

    expect(recommendations).toEqual([]);
  });

  it('scope_growth > 20% -> "Review or remove low-priority scope."', () => {
    const metrics = { ...healthyMetrics(), scope: scopeMetrics({ scopeGrowthPercent: 25 }) };
    const recommendations = generateRecommendations(metrics, dimensionsFor(metrics));

    expect(recommendations).toContainEqual({
      code: 'SCOPE_GROWTH',
      message: 'Review or remove low-priority scope.',
    });
  });

  it('blocked_issues >= 3 -> "Review the top blockers and assign owners."', () => {
    const metrics = {
      ...healthyMetrics(),
      dependencies: dependenciesMetrics({ blockedCount: 3 }),
    };
    const recommendations = generateRecommendations(metrics, dimensionsFor(metrics));

    expect(recommendations).toContainEqual({
      code: 'BLOCKED_ISSUES',
      message: 'Review the top blockers and assign owners.',
    });
  });

  it('overdue_ratio > 0.20 -> "Review project schedule and overdue work."', () => {
    const metrics = {
      ...healthyMetrics(),
      schedule: scheduleMetrics({ overdueRatio: 0.3, overdueIssuesCount: 3 }),
    };
    const recommendations = generateRecommendations(metrics, dimensionsFor(metrics));

    expect(recommendations).toContainEqual({
      code: 'OVERDUE_ISSUES',
      message: 'Review project schedule and overdue work.',
    });
  });

  it('workload_signal == HIGH -> "Review WIP and team allocation."', () => {
    const metrics = {
      ...healthyMetrics(),
      capacity: capacityMetrics({ workloadSignal: 'HIGH', maxWipPerUser: 5, averageWipPerUser: 2 }),
    };
    const recommendations = generateRecommendations(metrics, dimensionsFor(metrics));

    expect(recommendations).toContainEqual({
      code: 'CAPACITY_OVERLOAD',
      message: 'Review WIP and team allocation.',
    });
  });

  it('orders triggered recommendations by factor impact (most negative first) and caps at 3', () => {
    // Impacts (see dimensions.ts): CAPACITY_OVERLOAD is a fixed -60; SCOPE_GROWTH
    // for 25% (risk band) is -50; OVERDUE_ISSUES for ratio 0.22 (<=0.25 tier) is
    // -40; BLOCKED_ISSUES for 3 issues is -24 (3 * -8). All 4 rules fire, so the
    // weakest (blocked) is dropped by the top-3 cap.
    const metrics: ProjectMetrics = {
      schedule: scheduleMetrics({ overdueRatio: 0.22, overdueIssuesCount: 2 }),
      delivery: deliveryMetrics(),
      scope: scopeMetrics({ scopeGrowthPercent: 25 }),
      capacity: capacityMetrics({ workloadSignal: 'HIGH', maxWipPerUser: 5, averageWipPerUser: 2 }),
      dependencies: dependenciesMetrics({ blockedCount: 3 }),
    };

    const recommendations = generateRecommendations(metrics, dimensionsFor(metrics));

    expect(recommendations).toHaveLength(3);
    expect(recommendations.map((r) => r.code)).toEqual([
      'CAPACITY_OVERLOAD',
      'SCOPE_GROWTH',
      'OVERDUE_ISSUES',
    ]);
  });
});
