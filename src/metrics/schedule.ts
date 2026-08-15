// Schedule dimension raw metrics (§9). Pure function, no I/O (§23) — takes the
// normalizer's output and today's date, returns the numbers the Fase 3 health
// engine will turn into a score. Per the missing-data invariant (CLAUDE.md /
// §24 Resilience), ratios that would divide by zero are `null`, never 0.

import { NormalizedIssue } from './model';

export interface ScheduleMetrics {
  /** overdueIssues / issuesWithDueDate. null when no issue has a due date. */
  overdueRatio: number | null;
  /** doneIssues / totalIssues. null when the project has no issues at all. */
  completionRatio: number | null;
  totalIssues: number;
  doneIssues: number;
  issuesWithDueDateCount: number;
  overdueIssuesCount: number;
  /**
   * Issues still in TODO/IN_PROGRESS (the "planned" set — §9 Inputs) that
   * have no due date set. Done issues are excluded: a completed issue
   * missing a due date isn't a scheduling risk.
   */
  missingDueDateCount: number;
}

/** An issue is overdue if it's not Done, has a due date, and that date is in the past. */
function isOverdue(issue: NormalizedIssue, now: Date): boolean {
  if (issue.statusCategory === 'DONE' || !issue.dueDate) return false;
  return new Date(issue.dueDate).getTime() < now.getTime();
}

export function computeScheduleMetrics(
  issues: NormalizedIssue[],
  now: Date = new Date()
): ScheduleMetrics {
  const totalIssues = issues.length;
  const doneIssues = issues.filter((issue) => issue.statusCategory === 'DONE').length;
  const issuesWithDueDateCount = issues.filter((issue) => issue.dueDate !== null).length;
  const overdueIssuesCount = issues.filter((issue) => isOverdue(issue, now)).length;
  const missingDueDateCount = issues.filter(
    (issue) => issue.statusCategory !== 'DONE' && issue.dueDate === null
  ).length;

  return {
    overdueRatio: issuesWithDueDateCount === 0 ? null : overdueIssuesCount / issuesWithDueDateCount,
    completionRatio: totalIssues === 0 ? null : doneIssues / totalIssues,
    totalIssues,
    doneIssues,
    issuesWithDueDateCount,
    overdueIssuesCount,
    missingDueDateCount,
  };
}
