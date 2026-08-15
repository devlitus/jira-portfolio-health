// Status thresholds (§14). Pure function, no I/O — maps the Health Score
// (Tarea 3.1) to a project status, using the thresholds from config
// (Tarea 1.4: defaults 80/60, overridable per-installation).

import { DEFAULT_THRESHOLDS } from '../storage/configStore';
import type { StatusThresholds } from '../storage/configStore';

export type ProjectStatus = 'HEALTHY' | 'AT_RISK' | 'CRITICAL';

/**
 * §14: healthScore >= thresholds.healthy -> HEALTHY;
 * >= thresholds.atRisk (and < healthy) -> AT_RISK; below -> CRITICAL.
 * Defaults to the MVP thresholds (80/60) when the caller doesn't pass config
 * thresholds explicitly.
 */
export function getStatus(
  healthScore: number,
  thresholds: Pick<StatusThresholds, 'healthy' | 'atRisk'> = DEFAULT_THRESHOLDS
): ProjectStatus {
  if (healthScore >= thresholds.healthy) return 'HEALTHY';
  if (healthScore >= thresholds.atRisk) return 'AT_RISK';
  return 'CRITICAL';
}
