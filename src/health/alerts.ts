// Alert Engine (§20, Tarea 6.1.a). Pure, data-driven rule table (same shape
// as the Recommendation Engine, health/recommendations.ts) that compares two
// consecutive daily snapshots (Tarea 5.1's StoredSnapshot) and reports which
// of the 5 MVP alert rules fired. No I/O here — the daily trigger
// (src/triggers/dailySnapshot.ts, Tarea 6.1.c) reads/writes snapshots and
// persists the result (src/storage/alertStore.ts, Tarea 6.1.b).
//
// Rules 4 and 5 key off HealthFactor codes already present in the stored
// dimension results (Tarea 3.2) rather than requiring new raw fields on
// StoredSnapshot:
// - "New critical dependency" (rule 4) = an AGED_BLOCKERS factor (a blocker
//   open more than 5 days — §13's own example of the severe case) appears on
//   the current snapshot's dependencies dimension but wasn't present on the
//   previous one.
// - "Scope growth exceeds threshold" (rule 5) = the SCOPE_GROWTH factor is in
//   its most severe band (>25% growth, computeScopeScore's §11 "critical"
//   tier) on the current snapshot. Unlike the other 4 rules this is a state
//   check, not a current-vs-previous comparison.

import { StoredSnapshot } from '../storage/snapshotStore';

export type AlertRuleCode =
  | 'HEALTH_DROP'
  | 'HEALTHY_TO_AT_RISK'
  | 'AT_RISK_TO_CRITICAL'
  | 'NEW_CRITICAL_DEPENDENCY'
  | 'SCOPE_GROWTH_THRESHOLD';

export interface Alert {
  code: AlertRuleCode;
  projectKey: string;
  /** yyyy-mm-dd — the date of the snapshot that triggered this alert. */
  date: string;
  message: string;
}

/** §20 rule 1: a same-day drop of 10 points or more. */
const HEALTH_DROP_THRESHOLD = 10;
/** dimensions.ts's computeScopeScore "critical" tier (>25% growth, §11). */
const CRITICAL_SCOPE_GROWTH_IMPACT = -75;
const AGED_BLOCKERS_FACTOR_CODE = 'AGED_BLOCKERS';
const SCOPE_GROWTH_FACTOR_CODE = 'SCOPE_GROWTH';

function hasFactor(
  snapshot: StoredSnapshot | null,
  dimension: keyof StoredSnapshot['dimensions'],
  code: string
): boolean {
  return (snapshot?.dimensions[dimension].factors ?? []).some((factor) => factor.code === code);
}

interface AlertRule {
  code: AlertRuleCode;
  /** Returns the alert message when the rule fires, null otherwise. */
  check: (current: StoredSnapshot, previous: StoredSnapshot | null) => string | null;
}

const RULES: AlertRule[] = [
  {
    code: 'HEALTH_DROP',
    check: (current, previous) => {
      if (current.healthScore === null || previous?.healthScore == null) return null;
      const drop = previous.healthScore - current.healthScore;
      if (drop < HEALTH_DROP_THRESHOLD) return null;
      return `Health score dropped ${drop} points (from ${previous.healthScore} to ${current.healthScore})`;
    },
  },
  {
    code: 'HEALTHY_TO_AT_RISK',
    check: (current, previous) =>
      previous?.status === 'HEALTHY' && current.status === 'AT_RISK'
        ? 'Project status changed from Healthy to At Risk'
        : null,
  },
  {
    code: 'AT_RISK_TO_CRITICAL',
    check: (current, previous) =>
      previous?.status === 'AT_RISK' && current.status === 'CRITICAL'
        ? 'Project status changed from At Risk to Critical'
        : null,
  },
  {
    code: 'NEW_CRITICAL_DEPENDENCY',
    check: (current, previous) =>
      hasFactor(current, 'dependencies', AGED_BLOCKERS_FACTOR_CODE) &&
      !hasFactor(previous, 'dependencies', AGED_BLOCKERS_FACTOR_CODE)
        ? 'New critical dependency detected: a blocker has been open for more than 5 days'
        : null,
  },
  {
    code: 'SCOPE_GROWTH_THRESHOLD',
    check: (current) =>
      current.dimensions.scope.factors.some(
        (factor) => factor.code === SCOPE_GROWTH_FACTOR_CODE && factor.impact <= CRITICAL_SCOPE_GROWTH_IMPACT
      )
        ? 'Scope growth exceeded the critical threshold'
        : null,
  },
];

/**
 * Evaluates the §20 rule table for a project's newly-saved snapshot against
 * the one saved before it. `previous` is null for a project's first-ever
 * snapshot — every transition/comparison rule simply can't fire yet, same
 * "no data, no fabricated signal" reasoning used across the health engine
 * (§24 Resilience).
 */
export function evaluateAlerts(current: StoredSnapshot, previous: StoredSnapshot | null): Alert[] {
  const alerts: Alert[] = [];
  for (const rule of RULES) {
    const message = rule.check(current, previous);
    if (message !== null) {
      alerts.push({ code: rule.code, projectKey: current.projectKey, date: current.date, message });
    }
  }
  return alerts;
}
