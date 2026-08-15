import { getProjectIssues, listProjects, mapWithConcurrency, JiraFetchApi } from '../src/jira/client';

/** Minimal fake of @forge/api's APIResponse, enough for client.ts's needs. */
function mockResponse(overrides: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<unknown>;
  headers?: Record<string, string>;
}) {
  const headers = overrides.headers ?? {};
  return {
    ok: overrides.ok ?? true,
    status: overrides.status ?? 200,
    statusText: overrides.statusText ?? 'OK',
    json: overrides.json ?? (async () => ({})),
    headers: { get: (name: string) => headers[name] ?? null },
  };
}

describe('listProjects', () => {
  it('paginates through all project pages using startAt/isLast', async () => {
    const page1 = mockResponse({
      json: async () => ({
        isLast: false,
        values: [
          { id: '10001', key: 'KAN', name: 'Kanban Project' },
          { id: '10002', key: 'OPS', name: 'Ops' },
        ],
      }),
    });
    const page2 = mockResponse({
      json: async () => ({ isLast: true, values: [{ id: '10003', key: 'FIN', name: 'Finance' }] }),
    });
    const requestJira = jest.fn().mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);
    const api: JiraFetchApi = { requestJira };

    const projects = await listProjects(api);

    expect(projects).toEqual([
      { id: '10001', key: 'KAN', name: 'Kanban Project' },
      { id: '10002', key: 'OPS', name: 'Ops' },
      { id: '10003', key: 'FIN', name: 'Finance' },
    ]);
    expect(requestJira).toHaveBeenCalledTimes(2);
    const secondCallUrl = (requestJira.mock.calls[1][0] as { value: string }).value;
    expect(secondCallUrl).toContain('startAt=2');
  });

  it('throws when the Jira API returns a non-ok, non-retryable status', async () => {
    const requestJira = jest
      .fn()
      .mockResolvedValue(mockResponse({ ok: false, status: 500, statusText: 'Internal Server Error' }));
    const api: JiraFetchApi = { requestJira };

    await expect(listProjects(api)).rejects.toThrow('Failed to list Jira projects: 500 Internal Server Error');
  });
});

describe('getProjectIssues', () => {
  it('requests the minimal fields with changelog expanded and a quoted project JQL', async () => {
    const requestJira = jest.fn().mockResolvedValue(mockResponse({ json: async () => ({ issues: [] }) }));
    const api: JiraFetchApi = { requestJira };

    await getProjectIssues(api, 'KAN', { storyPointsFieldId: 'customfield_10016' });

    const calledUrl = (requestJira.mock.calls[0][0] as { value: string }).value;
    const [path, queryString] = calledUrl.split('?');
    const params = new URLSearchParams(queryString);

    expect(path).toBe('/rest/api/3/search/jql');
    expect(params.get('jql')).toBe('project = "KAN"');
    expect(params.get('expand')).toBe('changelog');
    expect(params.get('fields')).toContain('customfield_10016');
  });

  it('paginates through all issues using nextPageToken', async () => {
    const page1 = mockResponse({ json: async () => ({ issues: [{ key: 'KAN-1' }], nextPageToken: 'tok-2' }) });
    const page2 = mockResponse({ json: async () => ({ issues: [{ key: 'KAN-2' }] }) });
    const requestJira = jest.fn().mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);
    const api: JiraFetchApi = { requestJira };

    const result = await getProjectIssues(api, 'KAN');

    expect(result).toEqual({ ok: true, issues: [{ key: 'KAN-1' }, { key: 'KAN-2' }] });
    expect(requestJira).toHaveBeenCalledTimes(2);
    const secondCallUrl = (requestJira.mock.calls[1][0] as { value: string }).value;
    expect(secondCallUrl).toContain('nextPageToken=tok-2');
  });

  it('returns a clear permission message (not the raw HTTP status) on a 403', async () => {
    const requestJira = jest.fn().mockResolvedValue(mockResponse({ ok: false, status: 403, statusText: 'Forbidden' }));
    const api: JiraFetchApi = { requestJira };

    const result = await getProjectIssues(api, 'SECRET');

    expect(result).toEqual({
      ok: false,
      reason: "You don't have permission to view project SECRET in Jira.",
    });
  });

  it('returns the same clear permission message on a 401', async () => {
    const requestJira = jest
      .fn()
      .mockResolvedValue(mockResponse({ ok: false, status: 401, statusText: 'Unauthorized' }));
    const api: JiraFetchApi = { requestJira };

    const result = await getProjectIssues(api, 'SECRET');

    expect(result).toEqual({
      ok: false,
      reason: "You don't have permission to view project SECRET in Jira.",
    });
  });

  it('returns a clear "not found" message on a 404', async () => {
    const requestJira = jest.fn().mockResolvedValue(mockResponse({ ok: false, status: 404, statusText: 'Not Found' }));
    const api: JiraFetchApi = { requestJira };

    const result = await getProjectIssues(api, 'GONE');

    expect(result).toEqual({
      ok: false,
      reason: 'Project GONE was not found or is no longer accessible.',
    });
  });

  it('falls back to the raw Jira status for other failures', async () => {
    const requestJira = jest
      .fn()
      .mockResolvedValue(mockResponse({ ok: false, status: 500, statusText: 'Internal Server Error' }));
    const api: JiraFetchApi = { requestJira };

    const result = await getProjectIssues(api, 'KAN');

    expect(result).toEqual({
      ok: false,
      reason: 'Jira API returned 500 Internal Server Error for project KAN',
    });
  });

  it('returns { ok: false } instead of throwing on a network/unexpected error', async () => {
    const requestJira = jest.fn().mockRejectedValue(new Error('fetch failed'));
    const api: JiraFetchApi = { requestJira };

    const result = await getProjectIssues(api, 'KAN');

    expect(result).toEqual({ ok: false, reason: 'fetch failed' });
  });
});

describe('rate limiting (429 retry with backoff)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries after a 429 and honors the Retry-After header', async () => {
    jest.useFakeTimers();
    const requestJira = jest
      .fn()
      .mockResolvedValueOnce(mockResponse({ ok: false, status: 429, headers: { 'Retry-After': '1' } }))
      .mockResolvedValueOnce(mockResponse({ json: async () => ({ isLast: true, values: [] }) }));
    const api: JiraFetchApi = { requestJira };

    const pending = listProjects(api);
    await jest.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual([]);

    expect(requestJira).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retry budget and surfaces the last 429 response', async () => {
    jest.useFakeTimers();
    const response429 = mockResponse({ ok: false, status: 429, statusText: 'Too Many Requests' });
    const requestJira = jest.fn().mockResolvedValue(response429);
    const api: JiraFetchApi = { requestJira };

    const pending = listProjects(api);
    // Attach the rejection assertion before advancing timers, so the
    // rejection (which happens during the advance below) is never unhandled.
    const assertion = expect(pending).rejects.toThrow('Failed to list Jira projects: 429 Too Many Requests');
    // Let every exponential-backoff sleep (250ms, 500ms, 1000ms, ...) run out.
    await jest.advanceTimersByTimeAsync(10_000);
    await assertion;

    expect(requestJira).toHaveBeenCalledTimes(4); // initial attempt + 3 retries
  });
});

describe('mapWithConcurrency (Tarea 6.3, §24 Performance)', () => {
  it('preserves result order regardless of completion order', async () => {
    const delays = [30, 10, 20, 0];
    const fn = (ms: number) => new Promise<number>((resolve) => setTimeout(() => resolve(ms), ms));

    const results = await mapWithConcurrency(delays, 2, fn);

    expect(results).toEqual(delays);
  });

  it('never runs more than `limit` calls concurrently', async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    await mapWithConcurrency(items, 3, async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return item;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it('handles an empty list without invoking fn', async () => {
    const fn = jest.fn();

    const results = await mapWithConcurrency([], 5, fn);

    expect(results).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });

  it('runs every item when the limit exceeds the item count', async () => {
    const fn = jest.fn(async (item: string) => item.toUpperCase());

    const results = await mapWithConcurrency(['a', 'b'], 10, fn);

    expect(results).toEqual(['A', 'B']);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('propagates a rejection from fn to the caller', async () => {
    const fn = async (item: number) => {
      if (item === 2) throw new Error('boom');
      return item;
    };

    await expect(mapWithConcurrency([1, 2, 3], 2, fn)).rejects.toThrow('boom');
  });
});
