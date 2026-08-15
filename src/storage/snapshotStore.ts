// Snapshot Service (Tarea 5.1). Persists one ProjectSnapshot per project per
// day at KVS key `snapshot:<projectKey>:<yyyy-mm-dd>`
// (docs/architecture-decisions.md #1), and reads it back for trends
// (Tarea 5.3) and the scope-growth baseline (§11, closes Tarea 2.3).
//
// Prefix queries (`kvs.query().where('key', beginsWith(...))`) are enough to
// list a project's snapshots — the plan's alternative of a separate
// `snapshots-index:<projectKey>` index isn't needed, since @forge/kvs
// supports BEGINS_WITH queries on `key` natively. Query results aren't
// guaranteed to come back in key order, so every read sorts explicitly by
// the snapshot's own `date` field.

import { kvs, WhereConditions } from '@forge/kvs';
import { ProjectSnapshot } from '../metrics/model';

/** MVP retention window (Tarea 5.1.d) — no settings screen exposes this yet, so it's a constant. */
const RETENTION_DAYS = 90;

/**
 * A persisted snapshot. Extends the health-engine's ProjectSnapshot (§22)
 * with the issue count at analysis time, which is what getBaseline() below
 * needs to compute scope growth (§11) — the health-engine type itself only
 * carries dimension scores, not raw metrics.
 */
export type StoredSnapshot = ProjectSnapshot & {
  /** Issue count for the project at snapshot time (Fase 2's scope unit, Tarea 2.3). */
  totalIssues: number;
};

function snapshotKey(projectKey: string, date: string): string {
  return `snapshot:${projectKey}:${date}`;
}

function snapshotPrefix(projectKey: string): string {
  return `snapshot:${projectKey}:`;
}

/** Every stored snapshot for a project, oldest first, across all query pages. */
async function queryAllSnapshots(projectKey: string): Promise<StoredSnapshot[]> {
  const prefix = snapshotPrefix(projectKey);
  const entries: StoredSnapshot[] = [];
  let cursor: string | undefined;

  do {
    const builder = kvs.query().where('key', WhereConditions.beginsWith(prefix));
    const page = await (cursor ? builder.cursor(cursor) : builder).getMany<StoredSnapshot>();
    entries.push(...page.results.map((entry) => entry.value));
    cursor = page.nextCursor;
  } while (cursor);

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Persists a project's snapshot for the day named in `snapshot.date`, then
 * prunes anything past the retention window (Tarea 5.1.d) so old snapshots
 * don't accumulate forever. Writing the same date twice overwrites the same
 * key — that idempotency is what lets the daily trigger (Tarea 5.2) re-run
 * safely.
 */
export async function saveSnapshot(projectKey: string, snapshot: StoredSnapshot): Promise<void> {
  await kvs.set(snapshotKey(projectKey, snapshot.date), snapshot);
  await pruneExpiredSnapshots(projectKey);
}

/**
 * Returns the last `days` days of snapshots for a project, oldest first
 * (ready to feed a trend line, Tarea 5.3). Returns fewer than `days` entries
 * when the project doesn't have that much history yet.
 */
export async function getSnapshots(projectKey: string, days: number): Promise<StoredSnapshot[]> {
  const all = await queryAllSnapshots(projectKey);
  return all.slice(-days);
}

/**
 * Returns the scope (issue count) of the project's first stored snapshot,
 * used as the scope-growth baseline (§11 "cuando no exista baseline
 * formal", closes Tarea 2.3). Null until the project has at least one
 * snapshot.
 */
export async function getBaseline(projectKey: string): Promise<number | null> {
  const all = await queryAllSnapshots(projectKey);
  return all.length === 0 ? null : all[0].totalIssues;
}

/**
 * Deletes snapshots older than the retention window (MVP: 90 days).
 * Exported separately from saveSnapshot so retention can be tested and
 * reasoned about on its own, even though saveSnapshot calls it after every
 * write to keep storage self-bounding without relying on a caller to
 * remember to prune.
 */
export async function pruneExpiredSnapshots(projectKey: string, now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffDate = isoDate(cutoff);

  const all = await queryAllSnapshots(projectKey);
  const expired = all.filter((snapshot) => snapshot.date < cutoffDate);
  await Promise.all(expired.map((snapshot) => kvs.delete(snapshotKey(projectKey, snapshot.date))));
}
