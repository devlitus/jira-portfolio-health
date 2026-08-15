import { buildProjectDetail } from '../src/health/projectDetail';
import { DashboardEntry } from '../src/health/dashboard';
import { ProjectAnalysisOutcome, ProjectAnalysisSuccess } from '../src/health/analyzeProject';
import { Project, DimensionResult, HealthStatus, HealthFactor } from '../src/metrics/model';
import { Recommendation } from '../src/health/recommendations';

const EMPTY_DIMENSION: DimensionResult = { score: null, factors: [] };

function project(key: string, name = key): Project {
  return { id: key, key, name };
}

function dimension(score: number, factors: HealthFactor[] = []): DimensionResult {
  return { score, factors };
}

function success(
  projectKey: string,
  healthScore: number,
  status: HealthStatus,
  overrides: Partial<ProjectAnalysisSuccess> = {}
): ProjectAnalysisOutcome {
  return {
    ok: true,
    projectKey,
    date: '2026-08-15',
    healthScore,
    status,
    dimensions: {
      schedule: EMPTY_DIMENSION,
      delivery: EMPTY_DIMENSION,
      scope: EMPTY_DIMENSION,
      capacity: EMPTY_DIMENSION,
      dependencies: EMPTY_DIMENSION,
    },
    recommendations: [],
    ...overrides,
  };
}

function failure(projectKey: string, reason = 'boom'): ProjectAnalysisOutcome {
  return { ok: false, projectKey, reason };
}

describe('buildProjectDetail (§16 Project Detail)', () => {
  it('exposes health, status and a placeholder trend for a scored project', () => {
    const entry: DashboardEntry = {
      project: project('PAY', 'Payments Platform'),
      outcome: success('PAY', 42, 'CRITICAL'),
    };

    const detail = buildProjectDetail(entry);

    expect(detail.projectKey).toBe('PAY');
    expect(detail.projectName).toBe('Payments Platform');
    expect(detail.healthScore).toBe(42);
    expect(detail.status).toBe('CRITICAL');
    expect(detail.trend).toBe('—');
    expect(detail.reason).toBeUndefined();
  });

  it('maps each of the 5 dimensions with its score and a status derived from the §14 thresholds', () => {
    const entry: DashboardEntry = {
      project: project('PAY'),
      outcome: success('PAY', 50, 'AT_RISK', {
        dimensions: {
          schedule: dimension(38),
          delivery: dimension(71),
          scope: dimension(43),
          capacity: dimension(39),
          dependencies: dimension(41),
        },
      }),
    };

    const detail = buildProjectDetail(entry);

    expect(detail.dimensions).toEqual([
      { name: 'schedule', score: 38, status: 'CRITICAL', factors: [] },
      { name: 'delivery', score: 71, status: 'AT_RISK', factors: [] },
      { name: 'scope', score: 43, status: 'CRITICAL', factors: [] },
      { name: 'capacity', score: 39, status: 'CRITICAL', factors: [] },
      { name: 'dependencies', score: 41, status: 'CRITICAL', factors: [] },
    ]);
  });

  it('marks a null dimension as "N/A" (score and status both null) instead of penalizing it', () => {
    const entry: DashboardEntry = {
      project: project('PAY'),
      outcome: success('PAY', 50, 'AT_RISK', {
        dimensions: {
          schedule: EMPTY_DIMENSION,
          delivery: dimension(80),
          scope: EMPTY_DIMENSION,
          capacity: EMPTY_DIMENSION,
          dependencies: EMPTY_DIMENSION,
        },
      }),
    };

    const detail = buildProjectDetail(entry);
    const schedule = detail.dimensions.find((d) => d.name === 'schedule');

    expect(schedule?.score).toBeNull();
    expect(schedule?.status).toBeNull();
  });

  it('orders the "Why?" factors by impact, worst first, across all dimensions', () => {
    const entry: DashboardEntry = {
      project: project('PAY'),
      outcome: success('PAY', 42, 'CRITICAL', {
        dimensions: {
          schedule: dimension(60, [{ code: 'OVERDUE_ISSUES', impact: -20, message: '3 issues are overdue' }]),
          delivery: EMPTY_DIMENSION,
          scope: dimension(25, [{ code: 'SCOPE_GROWTH', impact: -75, message: 'Scope grew 27%' }]),
          capacity: dimension(40, [{ code: 'CAPACITY_OVERLOAD', impact: -60, message: 'Workload overload' }]),
          dependencies: EMPTY_DIMENSION,
        },
      }),
    };

    const detail = buildProjectDetail(entry);

    expect(detail.factors.map((f) => f.code)).toEqual(['SCOPE_GROWTH', 'CAPACITY_OVERLOAD', 'OVERDUE_ISSUES']);
  });

  it('passes through the top recommendations from the Recommendation Engine unchanged', () => {
    const recommendations: Recommendation[] = [{ code: 'SCOPE_GROWTH', message: 'Review or remove low-priority scope.' }];
    const entry: DashboardEntry = {
      project: project('PAY'),
      outcome: success('PAY', 42, 'CRITICAL', { recommendations }),
    };

    const detail = buildProjectDetail(entry);

    expect(detail.recommendations).toEqual(recommendations);
  });

  it('surfaces a "no analysis yet" reason with N/A dimensions when the project was never analyzed', () => {
    const entry: DashboardEntry = { project: project('PAY', 'Payments Platform'), outcome: undefined };

    const detail = buildProjectDetail(entry);

    expect(detail.healthScore).toBeNull();
    expect(detail.status).toBeNull();
    expect(detail.reason).toMatch(/no analysis yet/i);
    expect(detail.dimensions.every((d) => d.score === null && d.status === null)).toBe(true);
    expect(detail.factors).toEqual([]);
    expect(detail.recommendations).toEqual([]);
  });

  it('surfaces a failed analysis with its own reason', () => {
    const entry: DashboardEntry = {
      project: project('PAY', 'Payments Platform'),
      outcome: failure('PAY', 'Insufficient permissions'),
    };

    const detail = buildProjectDetail(entry);

    expect(detail.reason).toBe('Insufficient permissions');
    expect(detail.healthScore).toBeNull();
  });
});
