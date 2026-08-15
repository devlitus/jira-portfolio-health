// Jira Integration Layer (Tarea 1.3). Talks to the Jira REST API v3 from
// backend resolvers via `api.asUser()` (see docs/architecture-decisions.md
// #3) — the frontend never calls Jira directly.
//
// Every exported function here does its own I/O and error handling so the
// pure metrics/health layers (Fase 2/3) never have to deal with HTTP
// concerns. Per-project failures are surfaced as { ok: false, reason }
// instead of thrown exceptions, so one bad project can't take down the
// analysis of the rest of the portfolio (§24 Resilience).

import { route } from '@forge/api';
import type { APIResponse, Route, RequestProductMethod } from '@forge/api';
import type { JiraIssueShape } from '../metrics/model';
import type { Project } from '../metrics/model';

/** The subset of `api.asUser()` this module needs — kept minimal so tests
 * can pass a plain `{ requestJira: jest.fn() }` mock instead of the real SDK. */
export interface JiraFetchApi {
  requestJira: RequestProductMethod;
}

export type JiraApiFailure = { ok: false; reason: string };
export type JiraIssuesResult = { ok: true; issues: JiraIssueShape[] } | JiraApiFailure;

const PROJECT_SEARCH_PAGE_SIZE = 50;
const ISSUE_SEARCH_PAGE_SIZE = 100;

// Fields needed to build a NormalizedIssue (§22), minus story points, whose
// custom field id is instance-specific and passed in by the caller.
const BASE_ISSUE_FIELDS = [
  'summary',
  'status',
  'assignee',
  'duedate',
  'created',
  'resolutiondate',
  'labels',
  'issuelinks',
];

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 250;

interface JiraProjectSearchShape {
  id: string;
  key: string;
  name: string;
}

interface JiraProjectSearchResponse {
  isLast: boolean;
  values: JiraProjectSearchShape[];
}

interface JiraIssueSearchResponse {
  issues: JiraIssueShape[];
  nextPageToken?: string;
}

/**
 * Lists every Jira project visible to the current user.
 * GET /rest/api/3/project/search, paginated via startAt/isLast.
 */
export async function listProjects(api: JiraFetchApi): Promise<Project[]> {
  const projects: Project[] = [];
  let startAt = 0;

  for (;;) {
    const params = new URLSearchParams({
      startAt: String(startAt),
      maxResults: String(PROJECT_SEARCH_PAGE_SIZE),
    });

    const response = await requestJiraWithRetry(api, route`/rest/api/3/project/search?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to list Jira projects: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as JiraProjectSearchResponse;
    for (const project of data.values) {
      projects.push({ id: project.id, key: project.key, name: project.name });
    }

    if (data.isLast || data.values.length === 0) break;
    startAt += data.values.length;
  }

  return projects;
}

/**
 * Fetches every issue of a project, normalized-ready (raw Jira shape, with
 * changelog expanded). Never throws: a failure for this project (missing
 * permissions, transient API error) is reported as { ok: false, reason }
 * so the caller can skip it and keep analyzing the rest of the portfolio.
 */
export async function getProjectIssues(
  api: JiraFetchApi,
  projectKey: string,
  options: { storyPointsFieldId?: string } = {}
): Promise<JiraIssuesResult> {
  const fields = options.storyPointsFieldId
    ? [...BASE_ISSUE_FIELDS, options.storyPointsFieldId]
    : BASE_ISSUE_FIELDS;

  try {
    const issues: JiraIssueShape[] = [];
    let nextPageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        jql: `project = "${projectKey}"`,
        fields: fields.join(','),
        expand: 'changelog',
        maxResults: String(ISSUE_SEARCH_PAGE_SIZE),
      });
      if (nextPageToken) params.set('nextPageToken', nextPageToken);

      const response = await requestJiraWithRetry(api, route`/rest/api/3/search/jql?${params}`);
      if (!response.ok) {
        return { ok: false, reason: describeIssuesFailure(response, projectKey) };
      }

      const data = (await response.json()) as JiraIssueSearchResponse;
      issues.push(...data.issues);
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return { ok: true, issues };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : `Unknown error fetching project ${projectKey}`,
    };
  }
}

/**
 * Turns a failed `search/jql` response into a per-project failure reason.
 * 401/403/404 get a plain-English message (§26 error states — "mensaje
 * claro al usuario" for insufficient permissions); any other status falls
 * back to the raw Jira status, which is enough detail for the remaining
 * (unexpected/transient) cases.
 */
function describeIssuesFailure(response: APIResponse, projectKey: string): string {
  if (response.status === 401 || response.status === 403) {
    return `You don't have permission to view project ${projectKey} in Jira.`;
  }
  if (response.status === 404) {
    return `Project ${projectKey} was not found or is no longer accessible.`;
  }
  return `Jira API returned ${response.status} ${response.statusText} for project ${projectKey}`;
}

/**
 * Calls requestJira with simple retry + backoff on 429 (rate limiting).
 * Honors the Retry-After header when Jira sends one, otherwise falls back
 * to exponential backoff. Any other status (2xx/4xx/5xx) is returned as-is
 * for the caller to handle.
 */
async function requestJiraWithRetry(api: JiraFetchApi, path: Route): Promise<APIResponse> {
  let response: APIResponse;
  let attempt = 0;

  for (;;) {
    response = await api.requestJira(path);
    if (response.status !== 429 || attempt >= MAX_RETRIES) return response;

    await sleep(retryDelayMs(response, attempt));
    attempt += 1;
  }
}

function retryDelayMs(response: APIResponse, attempt: number): number {
  const retryAfterSeconds = Number(response.headers.get('Retry-After'));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return retryAfterSeconds * 1000;
  }
  return BASE_BACKOFF_MS * 2 ** attempt;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
