jest.mock('../src/jira/client', () => ({ getProjectIssues: jest.fn() }));
jest.mock('../src/storage/snapshotStore', () => ({ getBaseline: jest.fn() }));

import { analyzeProject } from '../src/health/analyzeProject';
import { getProjectIssues, JiraFetchApi } from '../src/jira/client';
import { getBaseline } from '../src/storage/snapshotStore';
import { JiraIssueShape } from '../src/metrics/model';

const mockedGetProjectIssues = getProjectIssues as jest.Mock;
const mockedGetBaseline = getBaseline as jest.Mock;

const NOW = new Date('2026-08-15T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const fakeApi: JiraFetchApi = { requestJira: jest.fn() };

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

function doneIssue(key: string): JiraIssueShape {
  return {
    key,
    fields: {
      status: { statusCategory: { key: 'done' } },
      created: daysAgo(30),
      duedate: daysAgo(10),
      resolutiondate: daysAgo(3),
    },
  };
}

describe('analyzeProject', () => {
  afterEach(() => {
    mockedGetProjectIssues.mockReset();
    mockedGetBaseline.mockReset();
  });

  it('surfaces a Jira client failure as { ok: false } instead of throwing', async () => {
    mockedGetProjectIssues.mockResolvedValue({
      ok: false,
      reason: 'Jira API returned 403 Forbidden for project KAN',
    });

    const result = await analyzeProject(fakeApi, 'KAN', { now: NOW });

    expect(result).toEqual({
      ok: false,
      projectKey: 'KAN',
      reason: 'Jira API returned 403 Forbidden for project KAN',
    });
    expect(mockedGetBaseline).not.toHaveBeenCalled();
  });

  it('runs the full pipeline end-to-end for a healthy project', async () => {
    mockedGetBaseline.mockResolvedValue(null);
    mockedGetProjectIssues.mockResolvedValue({
      ok: true,
      issues: [doneIssue('KAN-1'), doneIssue('KAN-2')],
    });

    const result = await analyzeProject(fakeApi, 'KAN', { now: NOW });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected a successful analysis');
    expect(result.projectKey).toBe('KAN');
    expect(result.date).toBe('2026-08-15');
    expect(result.healthScore).not.toBeNull();
    expect(result.status).toBe('HEALTHY');
    expect(result.dimensions.schedule.score).toBe(100);
    expect(result.dimensions.dependencies.score).toBe(100);
    expect(result.totalIssues).toBe(2);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(mockedGetProjectIssues).toHaveBeenCalledWith(fakeApi, 'KAN', { storyPointsFieldId: undefined });
    expect(mockedGetBaseline).toHaveBeenCalledWith('KAN');
  });

  it('produces a full result even with zero issues, driven only by the available dimensions', async () => {
    mockedGetBaseline.mockResolvedValue(null);
    mockedGetProjectIssues.mockResolvedValue({ ok: true, issues: [] });

    const result = await analyzeProject(fakeApi, 'KAN', { now: NOW });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected a successful analysis');
    // schedule/delivery/scope/capacity are all null (no signal); dependencies
    // is 100 (no blockers), so it alone drives the health score (§24).
    expect(result.dimensions.schedule.score).toBeNull();
    expect(result.dimensions.delivery.score).toBeNull();
    expect(result.dimensions.scope.score).toBeNull();
    expect(result.dimensions.capacity.score).toBeNull();
    expect(result.dimensions.dependencies.score).toBe(100);
    expect(result.healthScore).toBe(100);
    expect(result.status).toBe('HEALTHY');
    expect(result.recommendations).toEqual([]);
  });

  it('honors custom thresholds when deriving status from the health score', async () => {
    mockedGetBaseline.mockResolvedValue(null);
    mockedGetProjectIssues.mockResolvedValue({ ok: true, issues: [doneIssue('KAN-1')] });

    const result = await analyzeProject(fakeApi, 'KAN', {
      now: NOW,
      thresholds: { healthy: 101, atRisk: 101 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected a successful analysis');
    expect(result.status).toBe('CRITICAL');
  });
});
