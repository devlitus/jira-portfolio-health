import {
  computeScheduleScore,
  computeDeliveryScore,
  computeScopeScore,
  computeCapacityScore,
  computeDependenciesScore,
} from '../src/health/dimensions';
import { ScheduleMetrics } from '../src/metrics/schedule';
import { DeliveryMetrics } from '../src/metrics/delivery';
import { ScopeMetrics } from '../src/metrics/scope';
import { CapacityMetrics, CapacityMetricsUnavailable } from '../src/metrics/capacity';
import { DependenciesMetrics } from '../src/metrics/dependencies';

function scheduleMetrics(overrides: Partial<ScheduleMetrics>): ScheduleMetrics {
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

function deliveryMetrics(overrides: Partial<DeliveryMetrics>): DeliveryMetrics {
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

function capacityMetrics(
  overrides: Partial<CapacityMetrics>
): CapacityMetrics {
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

describe('computeScheduleScore (§9 — 3.2.a)', () => {
  it('scores 100 with no factors when there are no overdue issues', () => {
    const result = computeScheduleScore(scheduleMetrics({ overdueRatio: 0, overdueIssuesCount: 0 }));
    expect(result).toEqual({ score: 100, factors: [] });
  });

  it('applies a light penalty for a small overdue ratio', () => {
    const result = computeScheduleScore(
      scheduleMetrics({ overdueRatio: 0.08, overdueIssuesCount: 1, completionRatio: 0.5 })
    );
    expect(result.score).toBe(80);
    expect(result.factors).toEqual([
      { code: 'OVERDUE_ISSUES', impact: -20, message: '1 issue is overdue' },
    ]);
  });

  it('applies the critical tier for a very high overdue ratio', () => {
    const result = computeScheduleScore(
      scheduleMetrics({ overdueRatio: 0.6, overdueIssuesCount: 6, completionRatio: 0.5 })
    );
    expect(result.score).toBe(20);
  });

  it('adds a stalled-completion penalty when progress is stuck alongside overdue issues', () => {
    const result = computeScheduleScore(
      scheduleMetrics({ overdueRatio: 0.2, overdueIssuesCount: 2, completionRatio: 0.05 })
    );
    // 100 - 40 (overdue tier) - 10 (stalled) = 50
    expect(result.score).toBe(50);
    expect(result.factors.map((f) => f.code)).toEqual(['OVERDUE_ISSUES', 'STALLED_COMPLETION']);
  });

  it('returns null when no issue has a due date (no schedule signal, no false penalty)', () => {
    const result = computeScheduleScore(scheduleMetrics({ overdueRatio: null }));
    expect(result).toEqual({ score: null, factors: [] });
  });

  it('returns null when metrics are unavailable', () => {
    expect(computeScheduleScore(null)).toEqual({ score: null, factors: [] });
  });
});

describe('computeDeliveryScore (§10 — 3.2.b)', () => {
  it('scores 100 with no factors for a healthy delivery pattern', () => {
    const result = computeDeliveryScore(deliveryMetrics({}));
    expect(result).toEqual({ score: 100, factors: [] });
  });

  it('penalizes a throughput drop greater than 20%', () => {
    const result = computeDeliveryScore(deliveryMetrics({ throughputTrendPercent: -35 }));
    expect(result.score).toBe(80);
    expect(result.factors).toContainEqual(
      expect.objectContaining({ code: 'THROUGHPUT_DECLINING', impact: -20 })
    );
  });

  it('penalizes an elevated reopened ratio', () => {
    const result = computeDeliveryScore(deliveryMetrics({ reopenedRatio: 0.3, reopenedCount: 3 }));
    expect(result.score).toBe(90);
    expect(result.factors).toContainEqual(expect.objectContaining({ code: 'REOPENED_ISSUES', impact: -10 }));
  });

  it('penalizes aged in-progress issues', () => {
    const result = computeDeliveryScore(
      deliveryMetrics({ averageInProgressAgeDays: 21, inProgressIssuesWithAgeCount: 2 })
    );
    expect(result.score).toBe(90);
    expect(result.factors).toContainEqual(
      expect.objectContaining({ code: 'AGED_IN_PROGRESS_ISSUES', impact: -10 })
    );
  });

  it('stacks all three penalties when every signal fires', () => {
    const result = computeDeliveryScore(
      deliveryMetrics({
        throughputTrendPercent: -50,
        reopenedRatio: 0.4,
        reopenedCount: 4,
        averageInProgressAgeDays: 30,
        inProgressIssuesWithAgeCount: 3,
      })
    );
    expect(result.score).toBe(60);
    expect(result.factors).toHaveLength(3);
  });

  it('returns null when there is no completed or in-progress activity to judge (empty changelog)', () => {
    const result = computeDeliveryScore(
      deliveryMetrics({
        throughputTrendPercent: null,
        reopenedRatio: null,
        completedIssuesCount: 0,
        averageInProgressAgeDays: null,
        inProgressIssuesCount: 0,
        inProgressIssuesWithAgeCount: 0,
      })
    );
    expect(result).toEqual({ score: null, factors: [] });
  });

  it('returns null when metrics are unavailable', () => {
    expect(computeDeliveryScore(null)).toEqual({ score: null, factors: [] });
  });
});

describe('computeScopeScore (§11 — 3.2.c)', () => {
  it('scores 100 for 0% growth', () => {
    const result = computeScopeScore({ currentScope: 100, scopeGrowthPercent: 0 });
    expect(result).toEqual({ score: 100, factors: [] });
  });

  it('scores in the warning band for +10% growth', () => {
    const result = computeScopeScore({ currentScope: 110, scopeGrowthPercent: 10 });
    expect(result.score).toBe(75);
    expect(result.factors[0]).toEqual({
      code: 'SCOPE_GROWTH',
      impact: -25,
      message: 'Current scope is 10% larger than the initial baseline',
    });
  });

  it('§30 Scope creep: +30% growth scores <= 40', () => {
    const result = computeScopeScore({ currentScope: 300, scopeGrowthPercent: 30 });
    expect(result.score).not.toBeNull();
    expect(result.score as number).toBeLessThanOrEqual(40);
  });

  it('returns null when there is no baseline yet', () => {
    const result = computeScopeScore({ currentScope: 50, scopeGrowthPercent: null });
    expect(result).toEqual({ score: null, factors: [] });
  });

  it('returns null when metrics are unavailable', () => {
    expect(computeScopeScore(null)).toEqual({ score: null, factors: [] });
  });
});

describe('computeCapacityScore (§12 — 3.2.d)', () => {
  it('scores 100 for a NORMAL workload signal', () => {
    const result = computeCapacityScore(capacityMetrics({ workloadSignal: 'NORMAL' }));
    expect(result).toEqual({ score: 100, factors: [] });
  });

  it('scores 100 for a LOW workload signal (underuse is not an overload risk)', () => {
    const result = computeCapacityScore(capacityMetrics({ workloadSignal: 'LOW' }));
    expect(result).toEqual({ score: 100, factors: [] });
  });

  it('penalizes a HIGH workload signal', () => {
    const result = computeCapacityScore(
      capacityMetrics({ workloadSignal: 'HIGH', maxWipPerUser: 9, averageWipPerUser: 3 })
    );
    expect(result.score).toBe(40);
    expect(result.factors).toEqual([
      {
        code: 'CAPACITY_OVERLOAD',
        impact: -60,
        message: 'Workload is significantly above the normal WIP level (max 9 vs avg 3.0 per user)',
      },
    ]);
  });

  it('returns null when workload data is insufficient (§12 "no inventar datos")', () => {
    const unavailable: CapacityMetricsUnavailable = {
      ok: false,
      reason: 'Insufficient workload/capacity data',
    };
    expect(computeCapacityScore(unavailable)).toEqual({ score: null, factors: [] });
  });

  it('returns null when metrics are unavailable', () => {
    expect(computeCapacityScore(null)).toEqual({ score: null, factors: [] });
  });
});

describe('computeDependenciesScore (§13 — 3.2.e)', () => {
  function dependenciesMetrics(overrides: Partial<DependenciesMetrics>): DependenciesMetrics {
    return {
      blockedCount: 0,
      averageBlockedAgeDays: null,
      agedBlockedCount: 0,
      dependentProjectCount: 0,
      dependentProjectKeys: [],
      ...overrides,
    };
  }

  it('scores 100 with no factors when there are no blocked issues', () => {
    const result = computeDependenciesScore(dependenciesMetrics({}));
    expect(result).toEqual({ score: 100, factors: [] });
  });

  it('§30 Blocked dependencies: 5 blocked / 3 aged > 5 days decreases the score significantly', () => {
    const result = computeDependenciesScore(
      dependenciesMetrics({ blockedCount: 5, agedBlockedCount: 3 })
    );
    expect(result.score).not.toBeNull();
    expect(result.score as number).toBeLessThanOrEqual(50);
    expect(result.factors.map((f) => f.code)).toEqual(['BLOCKED_ISSUES', 'AGED_BLOCKERS']);
  });

  it('adds a penalty for cross-project dependencies', () => {
    const result = computeDependenciesScore(
      dependenciesMetrics({
        blockedCount: 1,
        dependentProjectCount: 2,
        dependentProjectKeys: ['OTHER', 'THIRD'],
      })
    );
    expect(result.factors).toContainEqual(
      expect.objectContaining({ code: 'EXTERNAL_DEPENDENCIES' })
    );
  });

  it('returns null when metrics are unavailable', () => {
    expect(computeDependenciesScore(null)).toEqual({ score: null, factors: [] });
  });
});
