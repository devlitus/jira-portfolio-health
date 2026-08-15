import { computeScheduleMetrics } from '../src/metrics/schedule';
import { NormalizedIssue, StatusCategory } from '../src/metrics/model';

const NOW = new Date('2026-08-15T00:00:00.000Z');

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

describe('computeScheduleMetrics', () => {
  it('reports no overdue issues when every due date is in the future', () => {
    const issues = [
      issue({ statusCategory: 'IN_PROGRESS', dueDate: '2026-09-01' }),
      issue({ statusCategory: 'TODO', dueDate: '2026-10-01' }),
      issue({ statusCategory: 'DONE', dueDate: '2026-07-01', resolutionDate: '2026-06-15' }),
    ];

    const metrics = computeScheduleMetrics(issues, NOW);

    expect(metrics.overdueRatio).toBe(0);
    expect(metrics.overdueIssuesCount).toBe(0);
    expect(metrics.issuesWithDueDateCount).toBe(3);
    expect(metrics.completionRatio).toBeCloseTo(1 / 3);
    expect(metrics.totalIssues).toBe(3);
    expect(metrics.doneIssues).toBe(1);
  });

  it('computes overdueRatio and completionRatio for a project with overdue issues', () => {
    const issues = [
      issue({ statusCategory: 'IN_PROGRESS', dueDate: '2026-07-01' }), // overdue
      issue({ statusCategory: 'TODO', dueDate: '2026-08-01' }), // overdue
      issue({ statusCategory: 'TODO', dueDate: '2026-09-01' }), // not overdue
      issue({ statusCategory: 'DONE', dueDate: '2026-07-01', resolutionDate: '2026-06-01' }), // done, not overdue even though date passed
    ];

    const metrics = computeScheduleMetrics(issues, NOW);

    expect(metrics.overdueIssuesCount).toBe(2);
    expect(metrics.issuesWithDueDateCount).toBe(4);
    expect(metrics.overdueRatio).toBe(0.5);
    expect(metrics.completionRatio).toBe(0.25);
  });

  it('returns overdueRatio null when no issue has a due date, without penalizing missing data', () => {
    const issues = [
      issue({ statusCategory: 'TODO' }),
      issue({ statusCategory: 'IN_PROGRESS' }),
      issue({ statusCategory: 'DONE', resolutionDate: '2026-06-01' }),
    ];

    const metrics = computeScheduleMetrics(issues, NOW);

    expect(metrics.overdueRatio).toBeNull();
    expect(metrics.issuesWithDueDateCount).toBe(0);
    expect(metrics.completionRatio).toBeCloseTo(1 / 3);
  });

  it('returns completionRatio null for a project with no issues at all', () => {
    const metrics = computeScheduleMetrics([], NOW);

    expect(metrics.totalIssues).toBe(0);
    expect(metrics.completionRatio).toBeNull();
    expect(metrics.overdueRatio).toBeNull();
    expect(metrics.missingDueDateCount).toBe(0);
  });

  it('counts missing due dates only within the planned (non-Done) set', () => {
    const issues = [
      issue({ statusCategory: 'TODO', dueDate: null }),
      issue({ statusCategory: 'IN_PROGRESS', dueDate: null }),
      issue({ statusCategory: 'DONE', dueDate: null, resolutionDate: '2026-06-01' }),
      issue({ statusCategory: 'TODO', dueDate: '2026-09-01' }),
    ];

    const metrics = computeScheduleMetrics(issues, NOW);

    expect(metrics.missingDueDateCount).toBe(2);
  });
});
