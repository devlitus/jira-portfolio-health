import { computeDeliveryMetrics } from '../src/metrics/delivery';
import { NormalizedIssue, StatusCategory, StatusTransition } from '../src/metrics/model';

const NOW = new Date('2026-08-15T00:00:00.000Z'); // Saturday
const DAY = 24 * 60 * 60 * 1000;

function issue(overrides: Partial<NormalizedIssue> & { statusCategory: StatusCategory }): NormalizedIssue {
  return {
    key: 'KAN-1',
    assigneeId: null,
    dueDate: null,
    created: '2026-01-01T00:00:00.000Z',
    resolutionDate: null,
    storyPoints: null,
    labels: [],
    links: [],
    history: [],
    ...overrides,
  };
}

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

function transition(fromStatus: string | null, toStatus: string, daysAgoValue: number): StatusTransition {
  return { fromStatus, toStatus, timestamp: daysAgo(daysAgoValue) };
}

describe('computeDeliveryMetrics — weekly throughput (2.2.a)', () => {
  it('buckets completed issues into the last N weeks by resolutionDate, oldest to newest', () => {
    const issues = [
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(1) }), // most recent week
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(3) }), // most recent week
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(10) }), // 2nd most recent week
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(40) }), // oldest week (6 weeks = 42 days)
    ];

    const metrics = computeDeliveryMetrics(issues, NOW, 6);

    expect(metrics.weeklyThroughput).toHaveLength(6);
    expect(metrics.weeklyThroughput[5]).toBe(2); // last 7 days
    expect(metrics.weeklyThroughput[4]).toBe(1); // 7-14 days ago
    expect(metrics.weeklyThroughput[0]).toBe(1); // 35-42 days ago
    expect(metrics.weeklyThroughput.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('returns all zeros when no issue has a resolutionDate', () => {
    const issues = [issue({ statusCategory: 'TODO' }), issue({ statusCategory: 'IN_PROGRESS' })];

    const metrics = computeDeliveryMetrics(issues, NOW, 6);

    expect(metrics.weeklyThroughput).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe('computeDeliveryMetrics — throughput trend (2.2.b)', () => {
  it('is null when fewer than 4 weeks are available', () => {
    const metrics = computeDeliveryMetrics([], NOW, 3);
    expect(metrics.throughputTrendPercent).toBeNull();
  });

  it('is null when the prior 2-week average is zero (avoids Infinity)', () => {
    const metrics = computeDeliveryMetrics([], NOW, 6);
    expect(metrics.throughputTrendPercent).toBeNull();
  });

  it('reports a positive % when throughput is increasing', () => {
    // Last 2 weeks (0-14 days ago): 4 + 4 = recent avg 4. Prior 2 weeks (14-28 days ago): 2 + 2 = prior avg 2. -> +100%
    const issues = [
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(1) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(2) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(3) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(4) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(8) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(9) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(10) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(11) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(15) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(16) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(22) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(23) }),
    ];

    const metrics = computeDeliveryMetrics(issues, NOW, 6);

    expect(metrics.weeklyThroughput.slice(2)).toEqual([2, 2, 4, 4]);
    expect(metrics.throughputTrendPercent).toBeCloseTo(100);
  });

  it('reports a negative % when throughput is decreasing', () => {
    // Last 2 weeks (0-14 days ago): 1 + 1 = recent avg 1. Prior 2 weeks (14-28 days ago): 2 + 2 = prior avg 2. -> -50%
    const issues = [
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(1) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(8) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(15) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(16) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(22) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(23) }),
    ];

    const metrics = computeDeliveryMetrics(issues, NOW, 6);

    expect(metrics.weeklyThroughput.slice(2)).toEqual([2, 2, 1, 1]);
    expect(metrics.throughputTrendPercent).toBeCloseTo(-50);
  });
});

describe('computeDeliveryMetrics — reopened ratio (2.2.c)', () => {
  it('is null when no issue has ever completed', () => {
    const issues = [issue({ statusCategory: 'TODO' }), issue({ statusCategory: 'IN_PROGRESS' })];

    const metrics = computeDeliveryMetrics(issues, NOW, 6);

    expect(metrics.reopenedRatio).toBeNull();
    expect(metrics.completedIssuesCount).toBe(0);
  });

  it('is 0 when completed issues were never reopened', () => {
    const issues = [
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(2) }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(5) }),
    ];

    const metrics = computeDeliveryMetrics(issues, NOW, 6);

    expect(metrics.reopenedRatio).toBe(0);
    expect(metrics.completedIssuesCount).toBe(2);
  });

  it('counts a Done -> non-Done changelog transition as reopened', () => {
    const issues = [
      issue({
        statusCategory: 'IN_PROGRESS', // reopened, so currently back in progress
        resolutionDate: null,
        history: [
          transition(null, 'In Progress', 10),
          transition('In Progress', 'Done', 6),
          transition('Done', 'In Progress', 3), // reopened
        ],
      }),
      issue({ statusCategory: 'DONE', resolutionDate: daysAgo(1) }), // completed, not reopened
    ];

    const metrics = computeDeliveryMetrics(issues, NOW, 6);

    expect(metrics.completedIssuesCount).toBe(2);
    expect(metrics.reopenedCount).toBe(1);
    expect(metrics.reopenedRatio).toBe(0.5);
  });
});

describe('computeDeliveryMetrics — average in-progress age (2.2.d)', () => {
  it('averages days since the last recorded transition for in-progress issues', () => {
    const issues = [
      issue({
        statusCategory: 'IN_PROGRESS',
        history: [transition('To Do', 'In Progress', 5)],
      }),
      issue({
        statusCategory: 'IN_PROGRESS',
        history: [transition('To Do', 'In Progress', 15)],
      }),
    ];

    const metrics = computeDeliveryMetrics(issues, NOW, 6);

    expect(metrics.inProgressIssuesCount).toBe(2);
    expect(metrics.inProgressIssuesWithAgeCount).toBe(2);
    expect(metrics.averageInProgressAgeDays).toBeCloseTo(10);
  });

  it('is null when in-progress issues have empty changelog (cycle time not available)', () => {
    const issues = [
      issue({ statusCategory: 'IN_PROGRESS', history: [] }),
      issue({ statusCategory: 'IN_PROGRESS', history: [] }),
    ];

    const metrics = computeDeliveryMetrics(issues, NOW, 6);

    expect(metrics.averageInProgressAgeDays).toBeNull();
    expect(metrics.inProgressIssuesCount).toBe(2);
    expect(metrics.inProgressIssuesWithAgeCount).toBe(0);
  });

  it('is null when there are no in-progress issues at all', () => {
    const issues = [issue({ statusCategory: 'DONE', resolutionDate: daysAgo(1) })];

    const metrics = computeDeliveryMetrics(issues, NOW, 6);

    expect(metrics.averageInProgressAgeDays).toBeNull();
    expect(metrics.inProgressIssuesCount).toBe(0);
  });
});
