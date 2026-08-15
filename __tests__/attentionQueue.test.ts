import { buildAttentionQueue } from '../src/health/attentionQueue';
import { DashboardEntry } from '../src/health/dashboard';
import { ProjectAnalysisOutcome } from '../src/health/analyzeProject';
import { Project, DimensionResult, HealthStatus, HealthFactor } from '../src/metrics/model';

const EMPTY_DIMENSION: DimensionResult = { score: null, factors: [] };

function project(key: string, name = key): Project {
  return { id: key, key, name };
}

function dimensionWith(factors: HealthFactor[]): DimensionResult {
  return { score: 50, factors };
}

function success(
  projectKey: string,
  healthScore: number,
  status: HealthStatus,
  factors: HealthFactor[] = []
): ProjectAnalysisOutcome {
  return {
    ok: true,
    projectKey,
    date: '2026-08-15',
    healthScore,
    status,
    dimensions: {
      schedule: factors.length > 0 ? dimensionWith(factors) : EMPTY_DIMENSION,
      delivery: EMPTY_DIMENSION,
      scope: EMPTY_DIMENSION,
      capacity: EMPTY_DIMENSION,
      dependencies: EMPTY_DIMENSION,
    },
    totalIssues: 0,
    recommendations: [],
  };
}

function failure(projectKey: string, reason = 'boom'): ProjectAnalysisOutcome {
  return { ok: false, projectKey, reason };
}

describe('buildAttentionQueue (§18 Attention Queue)', () => {
  it('orders by severity DESC (CRITICAL, then AT_RISK, then HEALTHY)', () => {
    const entries: DashboardEntry[] = [
      { project: project('H'), outcome: success('H', 50, 'HEALTHY') },
      { project: project('C'), outcome: success('C', 50, 'CRITICAL') },
      { project: project('R'), outcome: success('R', 50, 'AT_RISK') },
    ];

    const queue = buildAttentionQueue(entries);

    expect(queue.map((e) => e.projectKey)).toEqual(['C', 'R', 'H']);
  });

  it('within the same severity, orders by health score ASC', () => {
    const entries: DashboardEntry[] = [
      { project: project('B'), outcome: success('B', 47, 'CRITICAL') },
      { project: project('A'), outcome: success('A', 42, 'CRITICAL') },
    ];

    const queue = buildAttentionQueue(entries);

    expect(queue.map((e) => e.projectKey)).toEqual(['A', 'B']);
  });

  it('excludes projects with no analysis or a failed analysis', () => {
    const entries: DashboardEntry[] = [
      { project: project('OK'), outcome: success('OK', 50, 'AT_RISK') },
      { project: project('NONE'), outcome: undefined },
      { project: project('FAIL'), outcome: failure('FAIL') },
    ];

    const queue = buildAttentionQueue(entries);

    expect(queue.map((e) => e.projectKey)).toEqual(['OK']);
  });

  it('sets "Main issue" to the factor with the largest penalty across all dimensions', () => {
    const entries: DashboardEntry[] = [
      {
        project: project('PAY', 'Payments Platform'),
        outcome: success('PAY', 42, 'CRITICAL', [
          { code: 'OVERDUE_ISSUES', impact: -20, message: '3 issues are overdue' },
          { code: 'STALLED_COMPLETION', impact: -60, message: 'Scope grew 27%' },
        ]),
      },
    ];

    const queue = buildAttentionQueue(entries);

    expect(queue[0].mainIssue).toBe('Scope grew 27%');
  });

  it('sets "Main issue" to null when the project has no explainable factors', () => {
    const entries: DashboardEntry[] = [{ project: project('OK'), outcome: success('OK', 90, 'HEALTHY') }];

    const queue = buildAttentionQueue(entries);

    expect(queue[0].mainIssue).toBeNull();
  });

  it('defaults deterioration/deteriorationLabel to null when the entry carries no snapshot history', () => {
    const entries: DashboardEntry[] = [{ project: project('OK'), outcome: success('OK', 50, 'AT_RISK') }];

    const queue = buildAttentionQueue(entries);

    expect(queue[0].deterioration).toBeNull();
    expect(queue[0].deteriorationLabel).toBeNull();
  });

  it('carries through the resolver-precomputed deterioration and formats its label (§18)', () => {
    const entries: DashboardEntry[] = [
      { project: project('PAY'), outcome: success('PAY', 42, 'CRITICAL'), deterioration: -19 },
    ];

    const queue = buildAttentionQueue(entries);

    expect(queue[0].deterioration).toBe(-19);
    expect(queue[0].deteriorationLabel).toBe('↓ -19 in 14 days');
  });

  it('within the same severity and health score, orders by recent deterioration DESC (biggest drop first)', () => {
    const entries: DashboardEntry[] = [
      { project: project('SMALL_DROP'), outcome: success('SMALL_DROP', 50, 'AT_RISK'), deterioration: -3 },
      { project: project('BIG_DROP'), outcome: success('BIG_DROP', 50, 'AT_RISK'), deterioration: -19 },
      { project: project('IMPROVED'), outcome: success('IMPROVED', 50, 'AT_RISK'), deterioration: 5 },
    ];

    const queue = buildAttentionQueue(entries);

    expect(queue.map((e) => e.projectKey)).toEqual(['BIG_DROP', 'SMALL_DROP', 'IMPROVED']);
  });

  it('treats unknown deterioration as unchanged for ordering purposes', () => {
    const entries: DashboardEntry[] = [
      { project: project('KNOWN_IMPROVED'), outcome: success('KNOWN_IMPROVED', 50, 'AT_RISK'), deterioration: 5 },
      { project: project('UNKNOWN'), outcome: success('UNKNOWN', 50, 'AT_RISK') },
      { project: project('KNOWN_DROP'), outcome: success('KNOWN_DROP', 50, 'AT_RISK'), deterioration: -5 },
    ];

    const queue = buildAttentionQueue(entries);

    expect(queue.map((e) => e.projectKey)).toEqual(['KNOWN_DROP', 'UNKNOWN', 'KNOWN_IMPROVED']);
  });
});
