import { computeScopeMetrics } from '../src/metrics/scope';
import { NormalizedIssue, StatusCategory } from '../src/metrics/model';

function issue(statusCategory: StatusCategory): NormalizedIssue {
  return {
    key: 'KAN-1',
    statusCategory,
    assigneeId: null,
    dueDate: null,
    created: '2026-01-01T00:00:00.000Z',
    resolutionDate: null,
    storyPoints: null,
    labels: [],
    links: [],
    history: [],
  };
}

function issues(count: number): NormalizedIssue[] {
  return Array.from({ length: count }, () => issue('TODO'));
}

describe('computeScopeMetrics', () => {
  it('reports 0% growth when current scope matches the baseline', () => {
    const metrics = computeScopeMetrics(issues(240), 240);

    expect(metrics.currentScope).toBe(240);
    expect(metrics.scopeGrowthPercent).toBe(0);
  });

  it('reports +10% growth', () => {
    const metrics = computeScopeMetrics(issues(220), 200);

    expect(metrics.currentScope).toBe(220);
    expect(metrics.scopeGrowthPercent).toBeCloseTo(10);
  });

  it('reports +30% growth (spec example scaled: 240 -> 312)', () => {
    const metrics = computeScopeMetrics(issues(312), 240);

    expect(metrics.currentScope).toBe(312);
    expect(metrics.scopeGrowthPercent).toBeCloseTo(30);
  });

  it('returns scopeGrowthPercent null when there is no baseline yet', () => {
    const metrics = computeScopeMetrics(issues(300), null);

    expect(metrics.currentScope).toBe(300);
    expect(metrics.scopeGrowthPercent).toBeNull();
  });

  it('returns scopeGrowthPercent null when the baseline is 0 (avoids Infinity)', () => {
    const metrics = computeScopeMetrics(issues(5), 0);

    expect(metrics.scopeGrowthPercent).toBeNull();
  });
});
