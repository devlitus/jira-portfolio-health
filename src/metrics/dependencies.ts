// Dependencies dimension raw metrics (§13). Pure function, no I/O (§23).
//
// Jira's issuelinks payload doesn't expose when a "Blocks" link was created
// (see IssueLink in model.ts), so blockedAge can't be measured exactly as
// "days since the block was created" per the plan. This proxies it with the
// blocked issue's own last recorded status transition — the same "last
// update" approximation used for averageInProgressAgeDays in delivery.ts —
// falling back to the issue's created date when it has no changelog history
// at all, so every blocked issue still yields an age.

import { IssueLink, NormalizedIssue } from './model';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** §13 example ("2 blockers > 5 days"): blockers open longer than this are flagged as aged. */
const AGED_BLOCKER_THRESHOLD_DAYS = 5;

export interface DependenciesMetrics {
  /** Issues currently blocked by at least one unresolved "is blocked by" link. */
  blockedCount: number;
  /** Average age (days) of currently blocked issues, via the last-update proxy. null when there are no blocked issues. */
  averageBlockedAgeDays: number | null;
  /** Of blockedCount, how many have been blocked for more than AGED_BLOCKER_THRESHOLD_DAYS days. */
  agedBlockedCount: number;
  /** Distinct project keys (other than this project) that own an active blocker — cross-project dependency risk. */
  dependentProjectCount: number;
  dependentProjectKeys: string[];
}

/**
 * A link makes its issue "currently blocked" only when the blocker's status
 * is known and isn't Done. An unknown status (relatedStatusCategory === null,
 * e.g. the linked issue's fields weren't in the API response) is not treated
 * as blocking — §24 Resilience: don't invent data the app doesn't have.
 */
function isUnresolvedBlocker(link: IssueLink): boolean {
  return (
    link.direction === 'BLOCKED_BY' &&
    link.relatedStatusCategory !== null &&
    link.relatedStatusCategory !== 'DONE'
  );
}

function blockedAgeDays(issue: NormalizedIssue, now: Date): number {
  if (issue.history.length === 0) {
    return (now.getTime() - new Date(issue.created).getTime()) / MS_PER_DAY;
  }
  const lastTransitionTs = Math.max(...issue.history.map((t) => new Date(t.timestamp).getTime()));
  return (now.getTime() - lastTransitionTs) / MS_PER_DAY;
}

export function computeDependenciesMetrics(
  issues: NormalizedIssue[],
  projectKey: string,
  now: Date = new Date()
): DependenciesMetrics {
  const blockedIssues = issues.filter((issue) => issue.links.some(isUnresolvedBlocker));
  const ages = blockedIssues.map((issue) => blockedAgeDays(issue, now));

  const dependentProjectKeys = Array.from(
    new Set(
      blockedIssues
        .flatMap((issue) => issue.links.filter(isUnresolvedBlocker))
        .map((link) => link.relatedProjectKey)
        .filter((key) => key !== projectKey)
    )
  );

  return {
    blockedCount: blockedIssues.length,
    averageBlockedAgeDays:
      ages.length === 0 ? null : ages.reduce((sum, age) => sum + age, 0) / ages.length,
    agedBlockedCount: ages.filter((age) => age > AGED_BLOCKER_THRESHOLD_DAYS).length,
    dependentProjectCount: dependentProjectKeys.length,
    dependentProjectKeys,
  };
}
