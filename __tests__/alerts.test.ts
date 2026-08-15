import { evaluateAlerts } from '../src/health/alerts';
import { DimensionResult, HealthFactor, HealthStatus } from '../src/metrics/model';
import { StoredSnapshot } from '../src/storage/snapshotStore';

const EMPTY_DIMENSION: DimensionResult = { score: null, factors: [] };

function dimension(factors: HealthFactor[] = [], score: number | null = 100): DimensionResult {
  return { score, factors };
}

function snapshot(
  overrides: Partial<StoredSnapshot> & { healthScore: number | null; status: HealthStatus | null }
): StoredSnapshot {
  return {
    projectKey: 'KAN',
    date: '2026-08-15',
    totalIssues: 10,
    dimensions: {
      schedule: EMPTY_DIMENSION,
      delivery: EMPTY_DIMENSION,
      scope: EMPTY_DIMENSION,
      capacity: EMPTY_DIMENSION,
      dependencies: EMPTY_DIMENSION,
    },
    ...overrides,
  };
}

describe('evaluateAlerts (§20 Alert rules)', () => {
  it('returns no alerts for a project with no previous snapshot and nothing severe', () => {
    const current = snapshot({ healthScore: 90, status: 'HEALTHY' });

    expect(evaluateAlerts(current, null)).toEqual([]);
  });

  describe('rule 1 — health drops >= 10 points', () => {
    it('fires when the drop is exactly 10 points', () => {
      const previous = snapshot({ healthScore: 80, status: 'HEALTHY' });
      const current = snapshot({ healthScore: 70, status: 'AT_RISK' });

      const alerts = evaluateAlerts(current, previous);

      expect(alerts.map((a) => a.code)).toContain('HEALTH_DROP');
      const dropAlert = alerts.find((a) => a.code === 'HEALTH_DROP');
      expect(dropAlert?.message).toBe('Health score dropped 10 points (from 80 to 70)');
      expect(dropAlert?.projectKey).toBe('KAN');
      expect(dropAlert?.date).toBe('2026-08-15');
    });

    it('does not fire for a drop smaller than 10 points', () => {
      const previous = snapshot({ healthScore: 80, status: 'HEALTHY' });
      const current = snapshot({ healthScore: 72, status: 'HEALTHY' });

      expect(evaluateAlerts(current, previous).map((a) => a.code)).not.toContain('HEALTH_DROP');
    });

    it('does not fire when either score is null', () => {
      const previous = snapshot({ healthScore: null, status: null });
      const current = snapshot({ healthScore: 40, status: 'CRITICAL' });

      expect(evaluateAlerts(current, previous).map((a) => a.code)).not.toContain('HEALTH_DROP');
    });
  });

  describe('rule 2 — Healthy -> At Risk', () => {
    it('fires on the exact transition', () => {
      const previous = snapshot({ healthScore: 82, status: 'HEALTHY' });
      const current = snapshot({ healthScore: 75, status: 'AT_RISK' });

      expect(evaluateAlerts(current, previous).map((a) => a.code)).toContain('HEALTHY_TO_AT_RISK');
    });

    it('does not fire for other transitions', () => {
      const previous = snapshot({ healthScore: 55, status: 'AT_RISK' });
      const current = snapshot({ healthScore: 40, status: 'CRITICAL' });

      expect(evaluateAlerts(current, previous).map((a) => a.code)).not.toContain('HEALTHY_TO_AT_RISK');
    });
  });

  describe('rule 3 — At Risk -> Critical', () => {
    it('fires on the exact transition', () => {
      const previous = snapshot({ healthScore: 65, status: 'AT_RISK' });
      const current = snapshot({ healthScore: 50, status: 'CRITICAL' });

      expect(evaluateAlerts(current, previous).map((a) => a.code)).toContain('AT_RISK_TO_CRITICAL');
    });

    it('does not fire for other transitions', () => {
      const previous = snapshot({ healthScore: 82, status: 'HEALTHY' });
      const current = snapshot({ healthScore: 40, status: 'CRITICAL' });

      expect(evaluateAlerts(current, previous).map((a) => a.code)).not.toContain('AT_RISK_TO_CRITICAL');
    });
  });

  describe('rule 4 — new critical dependency detected', () => {
    it('fires when an aged blocker appears that was not present before', () => {
      const previous = snapshot({ healthScore: 85, status: 'HEALTHY' });
      const current = snapshot({
        healthScore: 78,
        status: 'HEALTHY',
        dimensions: {
          ...previous.dimensions,
          dependencies: dimension([{ code: 'AGED_BLOCKERS', impact: -12, message: '1 blocker open for 6 days' }]),
        },
      });

      expect(evaluateAlerts(current, previous).map((a) => a.code)).toContain('NEW_CRITICAL_DEPENDENCY');
    });

    it('does not fire when the aged blocker was already present in the previous snapshot', () => {
      const agedBlockers = dimension([{ code: 'AGED_BLOCKERS', impact: -12, message: '1 blocker open for 6 days' }]);
      const previous = snapshot({
        healthScore: 78,
        status: 'HEALTHY',
        dimensions: { ...emptyDimensionSet(), dependencies: agedBlockers },
      });
      const current = snapshot({
        healthScore: 77,
        status: 'HEALTHY',
        dimensions: { ...emptyDimensionSet(), dependencies: agedBlockers },
      });

      expect(evaluateAlerts(current, previous).map((a) => a.code)).not.toContain('NEW_CRITICAL_DEPENDENCY');
    });

    it('does not fire for a plain blocked issue that is not aged', () => {
      const current = snapshot({
        healthScore: 90,
        status: 'HEALTHY',
        dimensions: {
          ...emptyDimensionSet(),
          dependencies: dimension([{ code: 'BLOCKED_ISSUES', impact: -8, message: '1 issue blocked' }]),
        },
      });

      expect(evaluateAlerts(current, null).map((a) => a.code)).not.toContain('NEW_CRITICAL_DEPENDENCY');
    });
  });

  describe('rule 5 — scope growth exceeds threshold', () => {
    it('fires when the scope score is in the critical band (>25% growth)', () => {
      const current = snapshot({
        healthScore: 60,
        status: 'AT_RISK',
        dimensions: {
          ...emptyDimensionSet(),
          scope: dimension([{ code: 'SCOPE_GROWTH', impact: -75, message: 'Current scope is 30% larger' }], 25),
        },
      });

      expect(evaluateAlerts(current, null).map((a) => a.code)).toContain('SCOPE_GROWTH_THRESHOLD');
    });

    it('does not fire for a warning-band scope growth', () => {
      const current = snapshot({
        healthScore: 80,
        status: 'HEALTHY',
        dimensions: {
          ...emptyDimensionSet(),
          scope: dimension([{ code: 'SCOPE_GROWTH', impact: -25, message: 'Current scope is 10% larger' }], 75),
        },
      });

      expect(evaluateAlerts(current, null).map((a) => a.code)).not.toContain('SCOPE_GROWTH_THRESHOLD');
    });

    it('does not require a previous snapshot to fire', () => {
      const current = snapshot({
        healthScore: 40,
        status: 'CRITICAL',
        dimensions: {
          ...emptyDimensionSet(),
          scope: dimension([{ code: 'SCOPE_GROWTH', impact: -75, message: 'Current scope is 40% larger' }], 25),
        },
      });

      const alerts = evaluateAlerts(current, null);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].code).toBe('SCOPE_GROWTH_THRESHOLD');
    });
  });

  it('can report multiple alerts at once', () => {
    const previous = snapshot({ healthScore: 82, status: 'HEALTHY' });
    const current = snapshot({
      healthScore: 55,
      status: 'AT_RISK',
      dimensions: {
        ...emptyDimensionSet(),
        scope: dimension([{ code: 'SCOPE_GROWTH', impact: -75, message: 'Current scope is 30% larger' }], 25),
      },
    });

    const codes = evaluateAlerts(current, previous).map((a) => a.code);

    expect(codes).toEqual(expect.arrayContaining(['HEALTH_DROP', 'HEALTHY_TO_AT_RISK', 'SCOPE_GROWTH_THRESHOLD']));
  });
});

function emptyDimensionSet() {
  return {
    schedule: EMPTY_DIMENSION,
    delivery: EMPTY_DIMENSION,
    scope: EMPTY_DIMENSION,
    capacity: EMPTY_DIMENSION,
    dependencies: EMPTY_DIMENSION,
  };
}
