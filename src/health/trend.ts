// Trends (Tarea 5.3, §16, §19). Pure functions that turn a project's stored
// snapshots (Tarea 5.1, `snapshotStore.getSnapshots`) into the dashboard's
// Trend column (↑/↓/→) and the Project Detail's trend line
// (`78 → 71 → 64 → 55 → 42`, §16). No I/O here — the resolver (src/index.ts)
// is the only thing that reads KVS.

import { StoredSnapshot } from '../storage/snapshotStore';

export const TREND_PLACEHOLDER = '—';
const TREND_UP = '↑';
const TREND_DOWN = '↓';
const TREND_FLAT = '→';

/** How far back the dashboard's Trend column looks for a comparison point (§7 mockup). */
export const TREND_COMPARISON_WINDOW_DAYS = 7;
/** How many of the most recent snapshots the Project Detail trend line shows (§16 mockup has 5). */
export const TREND_LINE_POINTS = 5;
/** How far back the Attention Queue's deterioration check looks (§18 mockup: "in 14 days"). */
export const DETERIORATION_WINDOW_DAYS = 14;

export interface TrendPoint {
  /** yyyy-mm-dd */
  date: string;
  healthScore: number | null;
}

/** Maps stored snapshots to the trend series `getTrend` returns, oldest first. */
export function buildTrendSeries(snapshots: StoredSnapshot[]): TrendPoint[] {
  return snapshots.map(({ date, healthScore }) => ({ date, healthScore }));
}

function isoDaysAgo(now: Date, days: number): string {
  const target = new Date(now);
  target.setDate(target.getDate() - days);
  return target.toISOString().slice(0, 10);
}

/** The latest snapshot at or before `targetDate`, given snapshots sorted oldest first. */
function findSnapshotAsOf(snapshots: StoredSnapshot[], targetDate: string): StoredSnapshot | undefined {
  let found: StoredSnapshot | undefined;
  for (const snapshot of snapshots) {
    if (snapshot.date > targetDate) break;
    found = snapshot;
  }
  return found;
}

/**
 * Dashboard Trend column (§7): compares the current health score against the
 * snapshot closest to (but not after) `TREND_COMPARISON_WINDOW_DAYS` days
 * ago. Falls back to the placeholder when either side of the comparison is
 * unavailable — missing history must not be read as "flat" (§24 Resilience).
 */
export function computeTrendDirection(
  currentHealthScore: number | null,
  snapshots: StoredSnapshot[],
  now: Date = new Date()
): string {
  if (currentHealthScore === null) return TREND_PLACEHOLDER;

  const targetDate = isoDaysAgo(now, TREND_COMPARISON_WINDOW_DAYS);
  const past = findSnapshotAsOf(snapshots, targetDate);
  if (!past || past.healthScore === null) return TREND_PLACEHOLDER;

  if (currentHealthScore > past.healthScore) return TREND_UP;
  if (currentHealthScore < past.healthScore) return TREND_DOWN;
  return TREND_FLAT;
}

/**
 * Project Detail trend line (§16: `78 → 71 → 64 → 55 → 42`). `points` is
 * expected to already be sliced to the last `TREND_LINE_POINTS` entries.
 */
export function formatTrendLine(points: TrendPoint[]): string {
  if (points.length === 0) return TREND_PLACEHOLDER;
  return points.map((point) => (point.healthScore === null ? 'N/A' : String(point.healthScore))).join(' → ');
}

/**
 * Attention Queue deterioration (§18): current health score minus the score
 * from ~`DETERIORATION_WINDOW_DAYS` days ago. Negative means the project got
 * worse, positive means it improved. Null when either side of the comparison
 * is unavailable — missing history must not be read as "no change" (§24
 * Resilience), same reasoning as `computeTrendDirection` above.
 */
export function computeDeterioration(
  currentHealthScore: number | null,
  snapshots: StoredSnapshot[],
  now: Date = new Date()
): number | null {
  if (currentHealthScore === null) return null;

  const targetDate = isoDaysAgo(now, DETERIORATION_WINDOW_DAYS);
  const past = findSnapshotAsOf(snapshots, targetDate);
  if (!past || past.healthScore === null) return null;

  return currentHealthScore - past.healthScore;
}

/**
 * Formats the Attention Queue's deterioration line (§18: `↓ -19 in 14 days`).
 * Null when there's no comparison point to report — the caller should omit
 * the line rather than show a misleading "no change".
 */
export function formatDeterioration(deterioration: number | null): string | null {
  if (deterioration === null) return null;

  const arrow = deterioration < 0 ? TREND_DOWN : deterioration > 0 ? TREND_UP : TREND_FLAT;
  const sign = deterioration > 0 ? '+' : '';
  return `${arrow} ${sign}${deterioration} in ${DETERIORATION_WINDOW_DAYS} days`;
}
