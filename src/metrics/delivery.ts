// Delivery dimension raw metrics (§10). Pure function, no I/O (§23).
//
// The normalizer keeps issue history as raw Jira status *names*, not
// statusCategory (see model.ts) — Jira doesn't expose category on changelog
// items, and workflow status names vary per instance. Reopened-ratio and
// in-progress-age below therefore use documented name-based approximations
// rather than exact category matching, consistent with the blockedAge proxy
// documented for Tarea 1.2/2.5.

import { NormalizedIssue } from './model';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Status names commonly used for a "Done" workflow column, matched case-insensitively. */
const DONE_STATUS_NAME_PATTERN = /^(done|closed|resolved)$/i;

export interface DeliveryMetrics {
  /** Completed-issue count per week, oldest to most recent, length weeksCount. */
  weeklyThroughput: number[];
  /** % change between the avg of the last 2 weeks and the avg of the 2 before that. null if not computable. */
  throughputTrendPercent: number | null;
  /** reopenedCount / completedIssuesCount. null when no issue has ever been completed. */
  reopenedRatio: number | null;
  reopenedCount: number;
  /** Issues that reached a Done-like status at some point (by resolutionDate or history). */
  completedIssuesCount: number;
  /** Average age (days) of currently in-progress issues, from their last recorded transition. null if not computable. */
  averageInProgressAgeDays: number | null;
  inProgressIssuesCount: number;
  /** Of inProgressIssuesCount, how many had history to compute an age from. */
  inProgressIssuesWithAgeCount: number;
}

function weekBoundaries(now: Date, weeksCount: number): { start: number; end: number }[] {
  const boundaries: { start: number; end: number }[] = [];
  for (let i = 0; i < weeksCount; i++) {
    const weeksAgoStart = weeksCount - i;
    const weeksAgoEnd = weeksCount - i - 1;
    boundaries.push({
      start: now.getTime() - weeksAgoStart * MS_PER_WEEK,
      end: now.getTime() - weeksAgoEnd * MS_PER_WEEK,
    });
  }
  return boundaries;
}

function computeWeeklyThroughput(
  issues: NormalizedIssue[],
  now: Date,
  weeksCount: number
): number[] {
  const boundaries = weekBoundaries(now, weeksCount);
  const resolutionTimestamps = issues
    .map((issue) => (issue.resolutionDate ? new Date(issue.resolutionDate).getTime() : null))
    .filter((ts): ts is number => ts !== null);

  return boundaries.map(
    ({ start, end }) => resolutionTimestamps.filter((ts) => ts >= start && ts < end).length
  );
}

/** Variación % entre la media de las 2 últimas semanas y las 2 anteriores (§10). */
function computeThroughputTrendPercent(weeklyThroughput: number[]): number | null {
  if (weeklyThroughput.length < 4) return null;

  const n = weeklyThroughput.length;
  const recentAvg = (weeklyThroughput[n - 1] + weeklyThroughput[n - 2]) / 2;
  const priorAvg = (weeklyThroughput[n - 3] + weeklyThroughput[n - 4]) / 2;

  if (priorAvg === 0) return null;
  return ((recentAvg - priorAvg) / priorAvg) * 100;
}

function isDoneLikeStatusName(status: string): boolean {
  return DONE_STATUS_NAME_PATTERN.test(status);
}

/** An issue "reached Done" if it has a resolutionDate or ever transitioned into a Done-like status name. */
function hasEverCompleted(issue: NormalizedIssue): boolean {
  if (issue.resolutionDate !== null) return true;
  return issue.history.some((t) => isDoneLikeStatusName(t.toStatus));
}

/** Reopened: a Done-like status followed by a transition away from it. */
function isReopened(issue: NormalizedIssue): boolean {
  return issue.history.some((t) => t.fromStatus !== null && isDoneLikeStatusName(t.fromStatus) && !isDoneLikeStatusName(t.toStatus));
}

/**
 * Days since the issue's last recorded status transition, used as a proxy
 * for "time in the current (In Progress) status" — the normalizer doesn't
 * carry a name for the current status, so the most recent history entry's
 * timestamp is the closest available signal (same approximation documented
 * for blockedAge). Returns null when the issue has no history at all.
 */
function inProgressAgeDays(issue: NormalizedIssue, now: Date): number | null {
  if (issue.history.length === 0) return null;
  const lastTransitionTs = Math.max(...issue.history.map((t) => new Date(t.timestamp).getTime()));
  return (now.getTime() - lastTransitionTs) / MS_PER_DAY;
}

export function computeDeliveryMetrics(
  issues: NormalizedIssue[],
  now: Date = new Date(),
  weeksCount = 6
): DeliveryMetrics {
  const weeklyThroughput = computeWeeklyThroughput(issues, now, weeksCount);
  const throughputTrendPercent = computeThroughputTrendPercent(weeklyThroughput);

  const completedIssues = issues.filter(hasEverCompleted);
  const reopenedCount = issues.filter(isReopened).length;

  const inProgressIssues = issues.filter((issue) => issue.statusCategory === 'IN_PROGRESS');
  const inProgressAges = inProgressIssues
    .map((issue) => inProgressAgeDays(issue, now))
    .filter((age): age is number => age !== null);

  return {
    weeklyThroughput,
    throughputTrendPercent,
    reopenedRatio: completedIssues.length === 0 ? null : reopenedCount / completedIssues.length,
    reopenedCount,
    completedIssuesCount: completedIssues.length,
    averageInProgressAgeDays:
      inProgressAges.length === 0
        ? null
        : inProgressAges.reduce((sum, age) => sum + age, 0) / inProgressAges.length,
    inProgressIssuesCount: inProgressIssues.length,
    inProgressIssuesWithAgeCount: inProgressAges.length,
  };
}
