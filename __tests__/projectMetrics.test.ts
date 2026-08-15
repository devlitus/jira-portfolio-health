import { computeProjectMetrics } from '../src/metrics';
import { IssueLink, NormalizedIssue, StatusCategory } from '../src/metrics/model';

const NOW = new Date('2026-08-15T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const PROJECT_KEY = 'KAN';

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

function link(overrides: Partial<IssueLink> = {}): IssueLink {
  return {
    direction: 'BLOCKED_BY',
    relatedIssueKey: 'PAY-1',
    relatedProjectKey: 'PAY',
    relatedStatusCategory: 'IN_PROGRESS',
    ...overrides,
  };
}

function issue(overrides: Partial<NormalizedIssue> = {}): NormalizedIssue {
  return {
    key: 'KAN-1',
    statusCategory: 'TODO' as StatusCategory,
    assigneeId: null,
    dueDate: null,
    created: daysAgo(30),
    resolutionDate: null,
    storyPoints: null,
    labels: [],
    links: [],
    history: [],
    ...overrides,
  };
}

describe('computeProjectMetrics — full synthetic dataset', () => {
  const issues: NormalizedIssue[] = [
    // Overdue, no assignee.
    issue({ key: 'KAN-1', statusCategory: 'TODO', dueDate: daysAgo(5) }),
    // Done, on time.
    issue({
      key: 'KAN-2',
      statusCategory: 'DONE',
      dueDate: daysAgo(10),
      resolutionDate: daysAgo(3),
    }),
    // In progress, blocked by another project's open issue, assigned to user-a.
    issue({
      key: 'KAN-3',
      statusCategory: 'IN_PROGRESS',
      assigneeId: 'user-a',
      history: [{ fromStatus: 'To Do', toStatus: 'In Progress', timestamp: daysAgo(9) }],
      links: [link()],
    }),
    // In progress, assigned to user-b.
    issue({
      key: 'KAN-4',
      statusCategory: 'IN_PROGRESS',
      assigneeId: 'user-b',
      history: [{ fromStatus: 'To Do', toStatus: 'In Progress', timestamp: daysAgo(1) }],
    }),
  ];

  it('computes all 5 dimensions from one dataset without throwing', () => {
    const metrics = computeProjectMetrics(issues, PROJECT_KEY, 2, NOW);

    expect(metrics.schedule).toEqual(
      expect.objectContaining({ totalIssues: 4, doneIssues: 1, overdueIssuesCount: 1 })
    );

    expect(metrics.delivery).toEqual(
      expect.objectContaining({ completedIssuesCount: 1, inProgressIssuesCount: 2 })
    );

    expect(metrics.scope).toEqual({ currentScope: 4, scopeGrowthPercent: 100 });

    expect(metrics.capacity).toEqual(
      expect.objectContaining({ ok: true, activeUserCount: 2, workloadSignal: 'LOW' })
    );

    expect(metrics.dependencies).toEqual(
      expect.objectContaining({
        blockedCount: 1,
        agedBlockedCount: 1,
        dependentProjectCount: 1,
        dependentProjectKeys: ['PAY'],
      })
    );
  });
});

describe('computeProjectMetrics — no data', () => {
  it('never throws and reports null/insufficient-data for every dimension', () => {
    const metrics = computeProjectMetrics([], PROJECT_KEY, null, NOW);

    expect(metrics.schedule).toEqual(
      expect.objectContaining({ overdueRatio: null, completionRatio: null, totalIssues: 0 })
    );
    expect(metrics.delivery).toEqual(
      expect.objectContaining({ throughputTrendPercent: null, reopenedRatio: null })
    );
    expect(metrics.scope).toEqual({ currentScope: 0, scopeGrowthPercent: null });
    expect(metrics.capacity).toEqual({ ok: false, reason: 'Insufficient workload/capacity data' });
    expect(metrics.dependencies).toEqual(
      expect.objectContaining({ blockedCount: 0, averageBlockedAgeDays: null })
    );
  });
});
