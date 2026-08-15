import { buildDashboardSummary, DashboardEntry } from '../src/health/dashboard';
import { ProjectAnalysisOutcome } from '../src/health/analyzeProject';
import { Project, DimensionResult, HealthStatus } from '../src/metrics/model';

const EMPTY_DIMENSION: DimensionResult = { score: null, factors: [] };

function project(key: string, name = key): Project {
  return { id: key, key, name };
}

function success(
  projectKey: string,
  healthScore: number,
  status: HealthStatus
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
    totalIssues: 0,
    recommendations: [],
  };
}

function failure(projectKey: string, reason = 'boom'): ProjectAnalysisOutcome {
  return { ok: false, projectKey, reason };
}

describe('buildDashboardSummary (§7 Portfolio overview)', () => {
  it('averages health across scored projects and counts statuses', () => {
    const entries: DashboardEntry[] = [
      { project: project('PAY', 'Payments Platform'), outcome: success('PAY', 42, 'CRITICAL') },
      { project: project('CRM', 'CRM Migration'), outcome: success('CRM', 58, 'AT_RISK') },
      { project: project('AN', 'Analytics'), outcome: success('AN', 82, 'HEALTHY') },
    ];

    const summary = buildDashboardSummary(entries);

    expect(summary.overallHealth).toBe(Math.round((42 + 58 + 82) / 3));
    expect(summary.statusCounts).toEqual({ healthy: 1, atRisk: 1, critical: 1 });
    expect(summary.projects).toHaveLength(3);
    expect(summary.projects.map((p) => p.trend)).toEqual(['—', '—', '—']);
  });

  it('preserves entry order in the Health by Project rows', () => {
    const entries: DashboardEntry[] = [
      { project: project('B'), outcome: success('B', 90, 'HEALTHY') },
      { project: project('A'), outcome: success('A', 10, 'CRITICAL') },
    ];

    const summary = buildDashboardSummary(entries);

    expect(summary.projects.map((p) => p.projectKey)).toEqual(['B', 'A']);
  });

  it('ranks Top Attention by worst health first and caps at 3', () => {
    const entries: DashboardEntry[] = [
      { project: project('A'), outcome: success('A', 90, 'HEALTHY') },
      { project: project('B'), outcome: success('B', 42, 'CRITICAL') },
      { project: project('C'), outcome: success('C', 58, 'AT_RISK') },
      { project: project('D'), outcome: success('D', 61, 'AT_RISK') },
      { project: project('E'), outcome: success('E', 95, 'HEALTHY') },
    ];

    const summary = buildDashboardSummary(entries);

    expect(summary.topAttention.map((p) => p.projectKey)).toEqual(['B', 'C', 'D']);
  });

  it('treats a project with no cached analysis as unscored, with a reason, and excludes it from the average', () => {
    const entries: DashboardEntry[] = [
      { project: project('PAY', 'Payments Platform'), outcome: undefined },
      { project: project('AN', 'Analytics'), outcome: success('AN', 82, 'HEALTHY') },
    ];

    const summary = buildDashboardSummary(entries);

    expect(summary.overallHealth).toBe(82);
    const payRow = summary.projects.find((p) => p.projectKey === 'PAY');
    expect(payRow?.healthScore).toBeNull();
    expect(payRow?.status).toBeNull();
    expect(payRow?.reason).toMatch(/no analysis yet/i);
    expect(summary.topAttention).toHaveLength(1);
  });

  it('surfaces a failed analysis with its reason instead of a score', () => {
    const entries: DashboardEntry[] = [
      { project: project('PAY', 'Payments Platform'), outcome: failure('PAY', 'Insufficient permissions') },
    ];

    const summary = buildDashboardSummary(entries);

    expect(summary.overallHealth).toBeNull();
    expect(summary.statusCounts).toEqual({ healthy: 0, atRisk: 0, critical: 0 });
    expect(summary.projects[0].reason).toBe('Insufficient permissions');
  });

  it('uses the resolver-precomputed trend (Tarea 5.3) instead of the placeholder when provided', () => {
    const entries: DashboardEntry[] = [
      { project: project('PAY', 'Payments Platform'), outcome: success('PAY', 42, 'CRITICAL'), trend: '↓' },
      { project: project('AN', 'Analytics'), outcome: undefined, trend: '↑' },
    ];

    const summary = buildDashboardSummary(entries);

    expect(summary.projects.map((p) => p.trend)).toEqual(['↓', '↑']);
  });

  it('returns null overall health and an empty Top Attention when nothing is scored yet', () => {
    const entries: DashboardEntry[] = [{ project: project('PAY'), outcome: undefined }];

    const summary = buildDashboardSummary(entries);

    expect(summary.overallHealth).toBeNull();
    expect(summary.topAttention).toEqual([]);
  });
});
