// Config persistence (Tarea 1.4). Single per-installation document at KVS
// key `config:portfolio` (docs/architecture-decisions.md #2): which projects
// are monitored plus the status/scope-growth thresholds the health engine
// reads (§14, §11). Thresholds and baselinePolicy are optional on write —
// getConfig() fills in the MVP defaults below for anything not saved.

import { kvs } from '@forge/kvs';

const CONFIG_KEY = 'config:portfolio';

export interface ScopeGrowthThresholds {
  /** % scope growth vs. baseline above which the scope score turns Warning (§11). */
  warning: number;
  /** ...Risk. */
  risk: number;
  /** ...Critical. */
  critical: number;
}

export interface StatusThresholds {
  /** Health score >= this -> HEALTHY (§14). */
  healthy: number;
  /** Health score >= this (and < healthy) -> AT_RISK; below -> CRITICAL. */
  atRisk: number;
  scopeGrowth: ScopeGrowthThresholds;
}

export type BaselinePolicy = 'first-snapshot';

export interface PortfolioConfig {
  selectedProjectKeys: string[];
  thresholds: StatusThresholds;
  baselinePolicy: BaselinePolicy;
}

/** Shape callers may persist: thresholds/baselinePolicy are optional, so
 * saving a config never requires re-specifying values the user hasn't
 * customized yet. */
export type PortfolioConfigInput = {
  selectedProjectKeys: string[];
  thresholds?: Partial<Omit<StatusThresholds, 'scopeGrowth'>> & {
    scopeGrowth?: Partial<ScopeGrowthThresholds>;
  };
  baselinePolicy?: BaselinePolicy;
};

// §14 Status thresholds: 80-100 Healthy, 60-79 At Risk, 0-59 Critical.
export const DEFAULT_SCOPE_GROWTH_THRESHOLDS: ScopeGrowthThresholds = {
  // §11 Scope score interpretation: 0-5% Healthy, 5-15% Warning, 15-25% Risk, >25% Critical.
  warning: 5,
  risk: 15,
  critical: 25,
};

export const DEFAULT_THRESHOLDS: StatusThresholds = {
  healthy: 80,
  atRisk: 60,
  scopeGrowth: DEFAULT_SCOPE_GROWTH_THRESHOLDS,
};

export const DEFAULT_BASELINE_POLICY: BaselinePolicy = 'first-snapshot';

/**
 * Reads the portfolio config, filling in any missing threshold/policy field
 * with the MVP defaults. Never returns undefined: an installation that
 * hasn't saved a config yet gets the defaults with an empty project
 * selection, rather than the caller having to handle a missing document.
 */
export async function getConfig(): Promise<PortfolioConfig> {
  const stored = await kvs.get<PortfolioConfigInput>(CONFIG_KEY);

  return {
    selectedProjectKeys: stored?.selectedProjectKeys ?? [],
    thresholds: {
      healthy: stored?.thresholds?.healthy ?? DEFAULT_THRESHOLDS.healthy,
      atRisk: stored?.thresholds?.atRisk ?? DEFAULT_THRESHOLDS.atRisk,
      scopeGrowth: {
        warning: stored?.thresholds?.scopeGrowth?.warning ?? DEFAULT_SCOPE_GROWTH_THRESHOLDS.warning,
        risk: stored?.thresholds?.scopeGrowth?.risk ?? DEFAULT_SCOPE_GROWTH_THRESHOLDS.risk,
        critical: stored?.thresholds?.scopeGrowth?.critical ?? DEFAULT_SCOPE_GROWTH_THRESHOLDS.critical,
      },
    },
    baselinePolicy: stored?.baselinePolicy ?? DEFAULT_BASELINE_POLICY,
  };
}

/**
 * Persists the portfolio config as-is (partial thresholds are allowed;
 * getConfig() fills in defaults on read).
 */
export async function saveConfig(config: PortfolioConfigInput): Promise<void> {
  await kvs.set(CONFIG_KEY, config);
}
