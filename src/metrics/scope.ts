// Scope dimension raw metrics (§11). Pure function, no I/O (§23).
//
// MVP uses issue count as the scope unit (not story points — story-point
// fields aren't standardized across instances, per the plan's cross-cutting
// risk notes). The baseline is passed in as a parameter rather than fetched
// here: snapshot storage (src/storage/snapshotStore.ts) is only a stub until
// Fase 5, and Fase 2 metrics must stay pure/I/O-free (§23).

import { NormalizedIssue } from './model';

export interface ScopeMetrics {
  /** Issue count for the project right now (MVP scope unit). */
  currentScope: number;
  /** (currentScope - baselineScope) / baselineScope * 100. null when there's no baseline yet. */
  scopeGrowthPercent: number | null;
}

/**
 * @param baselineScope - scope (issue count) of the project's first stored
 * snapshot (§11 "cuando no exista baseline formal"), or null when no
 * baseline exists yet — e.g. before the app has taken its first snapshot.
 */
export function computeScopeMetrics(
  issues: NormalizedIssue[],
  baselineScope: number | null
): ScopeMetrics {
  const currentScope = issues.length;

  return {
    currentScope,
    scopeGrowthPercent:
      baselineScope === null || baselineScope === 0
        ? null
        : ((currentScope - baselineScope) / baselineScope) * 100,
  };
}
