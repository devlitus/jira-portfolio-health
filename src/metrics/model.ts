// Internal data model shared by the Jira integration layer, metrics engine and
// health engine. Types here describe the app's own shape of the data, not the
// raw Jira REST payload — normalizeIssue() is the boundary between the two.

/** Coarse-grained status bucket, derived from Jira's status category. */
export type StatusCategory = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type LinkDirection = 'BLOCKED_BY' | 'BLOCKS';

/**
 * A "Blocks"/"is blocked by" relationship extracted from issuelinks.
 * Only blocking-type links are modeled — other link types (relates to,
 * duplicates, etc.) are out of scope for the dependencies dimension (§13).
 */
export interface IssueLink {
  direction: LinkDirection;
  relatedIssueKey: string;
  relatedProjectKey: string;
  /** null when the linked issue's status wasn't included in the API response. */
  relatedStatusCategory: StatusCategory | null;
}

/**
 * A status change pulled from the issue changelog. Kept as raw status names
 * (not statusCategory) because mapping name -> category requires per-project
 * workflow context the normalizer doesn't have; that interpretation happens
 * downstream in the metrics layer (Fase 2), where a "Done"-column lookup or
 * heuristic is applied.
 */
export interface StatusTransition {
  fromStatus: string | null;
  toStatus: string;
  timestamp: string;
}

export interface NormalizedIssue {
  key: string;
  statusCategory: StatusCategory;
  assigneeId: string | null;
  dueDate: string | null;
  created: string;
  resolutionDate: string | null;
  /** null when no story-points field could be identified for this instance. */
  storyPoints: number | null;
  labels: string[];
  links: IssueLink[];
  history: StatusTransition[];
}

export interface Project {
  id: string;
  key: string;
  name: string;
}

/** One explainable reason behind a dimension score (§15). */
export interface HealthFactor {
  code: string;
  /** Negative = penalty, in health-score points. */
  impact: number;
  message: string;
}

export interface DimensionResult {
  score: number | null;
  factors: HealthFactor[];
}

export type HealthStatus = 'HEALTHY' | 'AT_RISK' | 'CRITICAL';

export interface ProjectSnapshot {
  projectKey: string;
  /** yyyy-mm-dd */
  date: string;
  healthScore: number | null;
  status: HealthStatus | null;
  dimensions: {
    schedule: DimensionResult;
    delivery: DimensionResult;
    scope: DimensionResult;
    capacity: DimensionResult;
    dependencies: DimensionResult;
  };
}

const STATUS_CATEGORY_KEY_MAP: Record<string, StatusCategory> = {
  new: 'TODO',
  indeterminate: 'IN_PROGRESS',
  done: 'DONE',
};

/** Maps Jira's statusCategory.key ("new"/"indeterminate"/"done") to our bucket. */
function toStatusCategory(key: string | undefined): StatusCategory {
  return (key && STATUS_CATEGORY_KEY_MAP[key]) || 'TODO';
}

interface JiraIssueLinkTypeShape {
  name: string;
}

interface JiraLinkedIssueShape {
  key: string;
  fields?: {
    status?: {
      statusCategory?: { key?: string };
    };
  };
}

interface JiraIssueLinkShape {
  type: JiraIssueLinkTypeShape;
  inwardIssue?: JiraLinkedIssueShape;
  outwardIssue?: JiraLinkedIssueShape;
}

interface JiraChangelogItemShape {
  field: string;
  fromString?: string | null;
  toString?: string | null;
}

interface JiraChangelogHistoryShape {
  created: string;
  items: JiraChangelogItemShape[];
}

export interface JiraIssueShape {
  key: string;
  fields: {
    status?: { statusCategory?: { key?: string } };
    assignee?: { accountId?: string } | null;
    duedate?: string | null;
    created: string;
    resolutiondate?: string | null;
    labels?: string[];
    issuelinks?: JiraIssueLinkShape[];
    [customFieldId: string]: unknown;
  };
  changelog?: {
    histories?: JiraChangelogHistoryShape[];
  };
}

function extractLinks(issuelinks: JiraIssueLinkShape[] | undefined): IssueLink[] {
  if (!issuelinks) return [];

  const links: IssueLink[] = [];
  for (const link of issuelinks) {
    if (link.type.name !== 'Blocks') continue;

    // "Blocks" links are directional: the inward side is blocked BY this
    // issue's counterpart, the outward side is blocked by this issue.
    if (link.inwardIssue) {
      links.push(toIssueLink('BLOCKED_BY', link.inwardIssue));
    }
    if (link.outwardIssue) {
      links.push(toIssueLink('BLOCKS', link.outwardIssue));
    }
  }
  return links;
}

function toIssueLink(direction: LinkDirection, related: JiraLinkedIssueShape): IssueLink {
  return {
    direction,
    relatedIssueKey: related.key,
    relatedProjectKey: related.key.split('-')[0],
    relatedStatusCategory: toStatusCategoryOrNull(related.fields?.status?.statusCategory?.key),
  };
}

function toStatusCategoryOrNull(key: string | undefined): StatusCategory | null {
  return key ? STATUS_CATEGORY_KEY_MAP[key] ?? null : null;
}

function extractHistory(histories: JiraChangelogHistoryShape[] | undefined): StatusTransition[] {
  if (!histories) return [];

  const transitions: StatusTransition[] = [];
  for (const entry of histories) {
    for (const item of entry.items) {
      if (item.field !== 'status') continue;
      transitions.push({
        fromStatus: item.fromString ?? null,
        toStatus: item.toString ?? '',
        timestamp: entry.created,
      });
    }
  }
  return transitions;
}

/**
 * Maps a raw Jira REST issue (as returned by /search/jql with
 * expand=changelog) into the app's internal NormalizedIssue shape.
 *
 * @param storyPointsFieldId - the customfield id holding story points on this
 * instance, if known (§ "Story points no estandarizados"). When omitted,
 * storyPoints is always null rather than guessing a field id.
 */
export function normalizeIssue(
  jiraIssue: JiraIssueShape,
  storyPointsFieldId?: string
): NormalizedIssue {
  const { fields } = jiraIssue;
  const storyPoints = storyPointsFieldId ? fields[storyPointsFieldId] : undefined;

  return {
    key: jiraIssue.key,
    statusCategory: toStatusCategory(fields.status?.statusCategory?.key),
    assigneeId: fields.assignee?.accountId ?? null,
    dueDate: fields.duedate ?? null,
    created: fields.created,
    resolutionDate: fields.resolutiondate ?? null,
    storyPoints: typeof storyPoints === 'number' ? storyPoints : null,
    labels: fields.labels ?? [],
    links: extractLinks(fields.issuelinks),
    history: extractHistory(jiraIssue.changelog?.histories),
  };
}
