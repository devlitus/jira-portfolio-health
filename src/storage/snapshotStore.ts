// Snapshot persistence — stub (forward reference from Tarea 2.3). Full
// snapshot read/write (save, list by date range, retention) is built in
// Fase 5 (Tarea 5.1). This module exists now only so the scope-growth
// baseline has a documented home; Fase 2's computeScopeMetrics() receives
// the baseline as a parameter rather than calling this function directly.

/**
 * Returns the scope (issue count) of the project's first stored snapshot,
 * used as the scope-growth baseline (§11 "cuando no exista baseline
 * formal"). Stub until Fase 5 (Tarea 5.1) implements snapshot storage —
 * always resolves null (no baseline available) until then.
 */
export async function getBaseline(projectKey: string): Promise<number | null> {
  console.log(`getBaseline(${projectKey}) — stub, no snapshot storage yet (lands in Fase 5, Tarea 5.1)`);
  return null;
}
