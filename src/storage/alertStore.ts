// Alert persistence (Tarea 6.1.b). Bounded per-project list at KVS key
// `alerts:<projectKey>` (same per-project key shape as snapshotStore.ts),
// capped at the most recent MAX_ALERTS_PER_PROJECT entries so storage stays
// bounded without a separate retention job like snapshots need (Tarea 5.1.d).

import { kvs } from '@forge/kvs';
import { Alert } from '../health/alerts';

const MAX_ALERTS_PER_PROJECT = 20;

function alertsKey(projectKey: string): string {
  return `alerts:${projectKey}`;
}

/**
 * Appends newly-triggered alerts to a project's history, keeping only the
 * most recent MAX_ALERTS_PER_PROJECT (oldest dropped first). No-op when
 * there's nothing new to add, so callers don't need to guard an empty list
 * themselves.
 */
export async function appendAlerts(projectKey: string, alerts: Alert[]): Promise<void> {
  if (alerts.length === 0) return;

  const existing = (await kvs.get<Alert[]>(alertsKey(projectKey))) ?? [];
  const combined = [...existing, ...alerts].slice(-MAX_ALERTS_PER_PROJECT);
  await kvs.set(alertsKey(projectKey), combined);
}

/** A project's stored alerts, oldest first (append order). Empty when none have fired yet. */
export async function getAlerts(projectKey: string): Promise<Alert[]> {
  return (await kvs.get<Alert[]>(alertsKey(projectKey))) ?? [];
}
