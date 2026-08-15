import { computeDependenciesMetrics } from '../src/metrics/dependencies';
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
    relatedIssueKey: 'KAN-99',
    relatedProjectKey: PROJECT_KEY,
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

describe('computeDependenciesMetrics — no blockers', () => {
  it('returns zero/null metrics when no issue has a blocking link', () => {
    const issues = [issue(), issue({ links: [link({ relatedStatusCategory: 'DONE' })] })];

    const metrics = computeDependenciesMetrics(issues, PROJECT_KEY, NOW);

    expect(metrics.blockedCount).toBe(0);
    expect(metrics.averageBlockedAgeDays).toBeNull();
    expect(metrics.agedBlockedCount).toBe(0);
    expect(metrics.dependentProjectCount).toBe(0);
    expect(metrics.dependentProjectKeys).toEqual([]);
  });

  it('does not count a link whose blocker status is unknown as blocking', () => {
    const issues = [issue({ links: [link({ relatedStatusCategory: null })] })];

    const metrics = computeDependenciesMetrics(issues, PROJECT_KEY, NOW);

    expect(metrics.blockedCount).toBe(0);
  });
});

describe('computeDependenciesMetrics — recent blocks', () => {
  it('counts an issue as blocked when its blocker is not Done, and reports a low age', () => {
    const issues = [
      issue({
        links: [link()],
        history: [{ fromStatus: 'To Do', toStatus: 'In Progress', timestamp: daysAgo(2) }],
      }),
    ];

    const metrics = computeDependenciesMetrics(issues, PROJECT_KEY, NOW);

    expect(metrics.blockedCount).toBe(1);
    expect(metrics.averageBlockedAgeDays).toBeCloseTo(2);
    expect(metrics.agedBlockedCount).toBe(0);
  });
});

describe('computeDependenciesMetrics — blocks older than 5 days', () => {
  it('flags blockers whose age proxy exceeds the aged threshold', () => {
    const issues = [
      issue({
        links: [link()],
        history: [{ fromStatus: 'To Do', toStatus: 'In Progress', timestamp: daysAgo(9) }],
      }),
      issue({
        links: [link()],
        history: [{ fromStatus: 'To Do', toStatus: 'In Progress', timestamp: daysAgo(1) }],
      }),
    ];

    const metrics = computeDependenciesMetrics(issues, PROJECT_KEY, NOW);

    expect(metrics.blockedCount).toBe(2);
    expect(metrics.agedBlockedCount).toBe(1);
    expect(metrics.averageBlockedAgeDays).toBeCloseTo(5);
  });

  it('falls back to the issue created date when it has no changelog history', () => {
    const issues = [issue({ created: daysAgo(8), links: [link()], history: [] })];

    const metrics = computeDependenciesMetrics(issues, PROJECT_KEY, NOW);

    expect(metrics.averageBlockedAgeDays).toBeCloseTo(8);
    expect(metrics.agedBlockedCount).toBe(1);
  });
});

describe('computeDependenciesMetrics — external (cross-project) dependencies', () => {
  it('reports distinct blocker projects other than the analyzed project', () => {
    const issues = [
      issue({ links: [link({ relatedProjectKey: 'PAY' })] }),
      issue({ links: [link({ relatedProjectKey: 'PAY' })] }),
      issue({ links: [link({ relatedProjectKey: 'AUTH' })] }),
      issue({ links: [link({ relatedProjectKey: PROJECT_KEY })] }), // same-project blocker
    ];

    const metrics = computeDependenciesMetrics(issues, PROJECT_KEY, NOW);

    expect(metrics.blockedCount).toBe(4);
    expect(metrics.dependentProjectCount).toBe(2);
    expect(metrics.dependentProjectKeys.sort()).toEqual(['AUTH', 'PAY']);
  });

  it('ignores BLOCKS (outgoing) links when counting blocked issues', () => {
    const issues = [issue({ links: [link({ direction: 'BLOCKS', relatedProjectKey: 'PAY' })] })];

    const metrics = computeDependenciesMetrics(issues, PROJECT_KEY, NOW);

    expect(metrics.blockedCount).toBe(0);
    expect(metrics.dependentProjectCount).toBe(0);
  });
});
