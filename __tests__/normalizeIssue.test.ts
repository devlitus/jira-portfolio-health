import { normalizeIssue, JiraIssueShape } from '../src/metrics/model';
import realSample from './fixtures/jira-issue-real-sample.json';
import richSample from './fixtures/jira-issue-rich-sample.json';

describe('normalizeIssue', () => {
  it('normalizes a minimal real issue from the Jira dev instance', () => {
    const result = normalizeIssue(realSample as JiraIssueShape);

    expect(result).toEqual({
      key: 'KAN-1',
      statusCategory: 'TODO',
      assigneeId: null,
      dueDate: null,
      created: '2026-07-02T19:00:24.424+0200',
      resolutionDate: null,
      storyPoints: null,
      labels: [],
      links: [],
      history: [],
    });
  });

  it('normalizes assignee, due date, resolution date and labels', () => {
    const result = normalizeIssue(richSample as JiraIssueShape);

    expect(result.key).toBe('KAN-42');
    expect(result.statusCategory).toBe('DONE');
    expect(result.assigneeId).toBe('557058:fc212809-c608-44e1-86f3-5416a3d46db5');
    expect(result.dueDate).toBe('2026-06-15');
    expect(result.resolutionDate).toBe('2026-06-20T17:30:00.000+0200');
    expect(result.labels).toEqual(['backend', 'payments']);
  });

  it('extracts only Blocks-type links, with direction and cross-project key', () => {
    const result = normalizeIssue(richSample as JiraIssueShape);

    expect(result.links).toEqual([
      {
        direction: 'BLOCKED_BY',
        relatedIssueKey: 'KAN-40',
        relatedProjectKey: 'KAN',
        relatedStatusCategory: 'IN_PROGRESS',
      },
      {
        direction: 'BLOCKS',
        relatedIssueKey: 'OPS-7',
        relatedProjectKey: 'OPS',
        relatedStatusCategory: 'DONE',
      },
    ]);
  });

  it('extracts status changelog history in order, ignoring non-status items', () => {
    const result = normalizeIssue(richSample as JiraIssueShape);

    expect(result.history).toEqual([
      { fromStatus: 'To Do', toStatus: 'In Progress', timestamp: '2026-06-02T10:00:00.000+0200' },
      { fromStatus: 'In Progress', toStatus: 'Done', timestamp: '2026-06-10T11:00:00.000+0200' },
      { fromStatus: 'Done', toStatus: 'In Progress', timestamp: '2026-06-12T08:00:00.000+0200' },
      { fromStatus: 'In Progress', toStatus: 'Done', timestamp: '2026-06-20T17:30:00.000+0200' },
    ]);
  });

  it('reads story points from the given custom field id, defaulting to null', () => {
    const withField: JiraIssueShape = {
      key: 'KAN-99',
      fields: {
        created: '2026-01-01T00:00:00.000+0000',
        customfield_10016: 5,
      },
    };

    expect(normalizeIssue(withField, 'customfield_10016').storyPoints).toBe(5);
    expect(normalizeIssue(withField).storyPoints).toBeNull();
  });

  it('defaults statusCategory to TODO when the Jira response omits it', () => {
    const noStatus: JiraIssueShape = {
      key: 'KAN-100',
      fields: { created: '2026-01-01T00:00:00.000+0000' },
    };

    expect(normalizeIssue(noStatus).statusCategory).toBe('TODO');
  });
});
