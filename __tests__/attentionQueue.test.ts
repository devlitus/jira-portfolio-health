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

  it('stubs deterioration at 0 until Fase 5 (Tarea 5.4)', () => {
    const entries: DashboardEntry[] = [{ project: project('OK'), outcome: success('OK', 50, 'AT_RISK') }];

    const queue = buildAttentionQueue(entries);

    expect(queue[0].deterioration).toBe(0);
  });
});
