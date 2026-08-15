// Capacity dimension raw metrics (§12). Pure function, no I/O (§23).
//
// Jira has no reliable signal for a person's real capacity (leave, part-time,
// other commitments), so per §12 "Estrategia MVP" the app only uses observable
// WIP (issues In Progress) per assignee as an overallocation proxy. §12's own
// example compares "current WIP/user" against the project's *historical*
// average, but that needs snapshot data that only exists from Fase 5 onward —
// Fase 2 metrics must stay I/O-free (§23). The MVP therefore uses fixed,
// documented thresholds comparing each user's WIP against the team's own
// current average, consistent with the other proxy approximations documented
// in schedule.ts/delivery.ts.

import { NormalizedIssue } from './model';

export type WorkloadSignal = 'LOW' | 'NORMAL' | 'HIGH';

export interface CapacityMetrics {
  ok: true;
  /** In-progress issue count per assignee. Unassigned issues are excluded (§12). */
  wipByAssignee: Record<string, number>;
  averageWipPerUser: number;
  maxWipPerUser: number;
  /** Number of distinct assignees with at least one in-progress issue. */
  activeUserCount: number;
  workloadSignal: WorkloadSignal;
}

/** §12 "Capacity: N/A" — not enough workload data to produce a signal without inventing data. */
export interface CapacityMetricsUnavailable {
  ok: false;
  reason: string;
}

/**
 * Minimum number of assignees with WIP needed before a team average is
 * meaningful (§12 "no inventar datos"). With 0 or 1 active users there's
 * nothing to compare a given user's load against.
 */
const MIN_ACTIVE_USERS = 2;

/** HIGH when one user's WIP exceeds 1.5x the team's current average WIP/user (plan's documented example threshold). */
const HIGH_SIGNAL_MULTIPLIER = 1.5;

/** LOW when the team's average WIP/user stays below this floor — most active users carry at most one item, signalling spare capacity rather than overload risk. */
const LOW_AVERAGE_WIP_THRESHOLD = 1.5;

function computeWorkloadSignal(averageWipPerUser: number, maxWipPerUser: number): WorkloadSignal {
  if (maxWipPerUser > averageWipPerUser * HIGH_SIGNAL_MULTIPLIER) return 'HIGH';
  if (averageWipPerUser < LOW_AVERAGE_WIP_THRESHOLD) return 'LOW';
  return 'NORMAL';
}

export function computeCapacityMetrics(
  issues: NormalizedIssue[]
): CapacityMetrics | CapacityMetricsUnavailable {
  const wipByAssignee: Record<string, number> = {};
  for (const issue of issues) {
    if (issue.statusCategory !== 'IN_PROGRESS' || issue.assigneeId === null) continue;
    wipByAssignee[issue.assigneeId] = (wipByAssignee[issue.assigneeId] ?? 0) + 1;
  }

  const wipCounts = Object.values(wipByAssignee);
  const activeUserCount = wipCounts.length;

  if (activeUserCount < MIN_ACTIVE_USERS) {
    return { ok: false, reason: 'Insufficient workload/capacity data' };
  }

  const averageWipPerUser = wipCounts.reduce((sum, count) => sum + count, 0) / activeUserCount;
  const maxWipPerUser = Math.max(...wipCounts);

  return {
    ok: true,
    wipByAssignee,
    averageWipPerUser,
    maxWipPerUser,
    activeUserCount,
    workloadSignal: computeWorkloadSignal(averageWipPerUser, maxWipPerUser),
  };
}
