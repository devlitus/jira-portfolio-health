import { computeCapacityMetrics } from '../src/metrics/capacity';
import { NormalizedIssue, StatusCategory } from '../src/metrics/model';

function issue(assigneeId: string | null, statusCategory: StatusCategory): NormalizedIssue {
  return {
    key: 'KAN-1',
    statusCategory,
    assigneeId,
    dueDate: null,
    created: '2026-01-01T00:00:00.000Z',
    resolutionDate: null,
    storyPoints: null,
    labels: [],
    links: [],
    history: [],
  };
}

describe('computeCapacityMetrics', () => {
  it('reports a NORMAL signal for a healthy, evenly distributed project', () => {
    const issues = [
      ...Array.from({ length: 3 }, () => issue('user-a', 'IN_PROGRESS')),
      ...Array.from({ length: 3 }, () => issue('user-b', 'IN_PROGRESS')),
      ...Array.from({ length: 4 }, () => issue('user-c', 'TODO')), // not WIP
    ];

    const metrics = computeCapacityMetrics(issues);

    expect(metrics.ok).toBe(true);
    if (!metrics.ok) return;
    expect(metrics.wipByAssignee).toEqual({ 'user-a': 3, 'user-b': 3 });
    expect(metrics.activeUserCount).toBe(2);
    expect(metrics.averageWipPerUser).toBe(3);
    expect(metrics.maxWipPerUser).toBe(3);
    expect(metrics.workloadSignal).toBe('NORMAL');
  });

  it('reports a HIGH signal when one user carries far more WIP than the team average', () => {
    const issues = [
      ...Array.from({ length: 8 }, () => issue('overloaded', 'IN_PROGRESS')),
      issue('user-b', 'IN_PROGRESS'),
      issue('user-c', 'IN_PROGRESS'),
    ];

    const metrics = computeCapacityMetrics(issues);

    expect(metrics.ok).toBe(true);
    if (!metrics.ok) return;
    expect(metrics.activeUserCount).toBe(3);
    expect(metrics.maxWipPerUser).toBe(8);
    expect(metrics.workloadSignal).toBe('HIGH');
  });

  it('reports a LOW signal when the team average WIP/user stays below the floor', () => {
    const issues = [issue('user-a', 'IN_PROGRESS'), issue('user-b', 'IN_PROGRESS')];

    const metrics = computeCapacityMetrics(issues);

    expect(metrics.ok).toBe(true);
    if (!metrics.ok) return;
    expect(metrics.averageWipPerUser).toBe(1);
    expect(metrics.workloadSignal).toBe('LOW');
  });

  it('returns ok:false when there are no assignees at all', () => {
    const issues = [issue(null, 'IN_PROGRESS'), issue(null, 'IN_PROGRESS')];

    const metrics = computeCapacityMetrics(issues);

    expect(metrics).toEqual({ ok: false, reason: 'Insufficient workload/capacity data' });
  });

  it('returns ok:false when fewer than 2 users have WIP', () => {
    const issues = [issue('user-a', 'IN_PROGRESS'), issue('user-b', 'TODO')];

    const metrics = computeCapacityMetrics(issues);

    expect(metrics).toEqual({ ok: false, reason: 'Insufficient workload/capacity data' });
  });
});
