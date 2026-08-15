// Tarea 6.3 (§24 Performance): measures the one part of the dashboard's
// load path that runs synchronously in the resolver process — reducing the
// selected projects' already-cached analysis (`DashboardEntry[]`, read from
// KVS by `loadDashboardEntries` in src/index.ts) into the three screens'
// view models. This is a lower bound, not the full request latency: it
// deliberately excludes KVS/Jira I/O, which src/index.ts already keeps off
// the hot path (getDashboard/getAttentionQueue/getProjectDetail never call
// Jira or `analyzeProject` — see docs/performance-notes.md). The point is to
// confirm the reduction itself isn't what could blow the <10s budget (§7) as
// portfolios grow past 10 projects.

import { buildDashboardSummary, DashboardEntry } from '../src/health/dashboard';
import { buildAttentionQueue } from '../src/health/attentionQueue';
import { buildProjectDetail } from '../src/health/projectDetail';
import { DimensionResult, HealthStatus, Project } from '../src/metrics/model';
import { ProjectAnalysisOutcome } from '../src/health/analyzeProject';
import { Alert } from '../src/health/alerts';

// Generous relative to the real budget (§7: <10s dashboard load) — this only
// covers the in-memory reduction step, so it should complete in low
// milliseconds; a few hundred ms of margin absorbs CI/CPU variance without
// making the assertion meaningless.
const BUDGET_MS = 1000;
const PROJECT_COUNT = 25;

function dimension(score: number, factorCount: number): DimensionResult {
  return {
    score,
    factors: Array.from({ length: factorCount }, (_, i) => ({
      code: `FACTOR_${i}`,
      impact: -(i + 1) * 5,
      message: `Synthetic factor ${i}`,
    })),
  };
}

function syntheticEntry(index: number): DashboardEntry {
  const project: Project = { id: String(index), key: `PRJ${index}`, name: `Project ${index}` };
  const healthScore = (index * 7) % 100;
  const status: HealthStatus = healthScore < 60 ? 'CRITICAL' : healthScore < 80 ? 'AT_RISK' : 'HEALTHY';

  const outcome: ProjectAnalysisOutcome = {
    ok: true,
    projectKey: project.key,
    date: '2026-08-15',
    healthScore,
    status,
    dimensions: {
      schedule: dimension(healthScore, 2),
      delivery: dimension(healthScore, 2),
      scope: dimension(healthScore, 1),
      capacity: dimension(healthScore, 1),
      dependencies: dimension(healthScore, 2),
    },
    totalIssues: 40,
    recommendations: [],
  };

  const alerts: Alert[] = [
    { code: 'HEALTH_DROP', projectKey: project.key, message: 'Health dropped 12 points', date: '2026-08-14' },
  ];

  return {
    project,
    outcome,
    trend: index % 2 === 0 ? '↓' : '↑',
    trendLine: '78 → 71 → 64 → 55 → 42',
    deterioration: -12,
    alerts,
  };
}

describe('Dashboard reduction performance (Tarea 6.3, §24 Performance)', () => {
  const entries = Array.from({ length: PROJECT_COUNT }, (_, i) => syntheticEntry(i));

  it(`reduces ${PROJECT_COUNT} cached analyses into the Portfolio overview well under budget`, () => {
    const start = performance.now();
    const summary = buildDashboardSummary(entries);
    const elapsedMs = performance.now() - start;

    expect(summary.projects).toHaveLength(PROJECT_COUNT);
    expect(elapsedMs).toBeLessThan(BUDGET_MS);
  });

  it(`reduces ${PROJECT_COUNT} cached analyses into the Attention Queue well under budget`, () => {
    const start = performance.now();
    const queue = buildAttentionQueue(entries);
    const elapsedMs = performance.now() - start;

    expect(queue).toHaveLength(PROJECT_COUNT);
    expect(elapsedMs).toBeLessThan(BUDGET_MS);
  });

  it(`reduces ${PROJECT_COUNT} Project Detail lookups well under budget`, () => {
    const start = performance.now();
    for (const entry of entries) {
      buildProjectDetail(entry);
    }
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(BUDGET_MS);
  });
});
