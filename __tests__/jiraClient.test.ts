import { getProjectIssues, listProjects, JiraFetchApi } from '../src/jira/client';

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

  it('returns { ok: false } instead of throwing when Jira denies access to the project', async () => {
    const requestJira = jest.fn().mockResolvedValue(mockResponse({ ok: false, status: 403, statusText: 'Forbidden' }));
    const api: JiraFetchApi = { requestJira };

    const result = await getProjectIssues(api, 'SECRET');

    expect(result).toEqual({ ok: false, reason: 'Jira API returned 403 Forbidden for project SECRET' });
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
