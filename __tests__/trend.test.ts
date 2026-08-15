import {
  buildTrendSeries,
  computeDeterioration,
  computeTrendDirection,
  formatDeterioration,
  formatTrendLine,
  TREND_PLACEHOLDER,
} from '../src/health/trend';
import { StoredSnapshot } from '../src/storage/snapshotStore';
import { DimensionResult } from '../src/metrics/model';

const EMPTY_DIMENSION: DimensionResult = { score: null, factors: [] };
const NOW = new Date('2026-08-15T00:00:00.000Z');

function snapshot(date: string, healthScore: number | null): StoredSnapshot {
  return {
    projectKey: 'PAY',
    date,
    healthScore,
    status: healthScore === null ? null : 'HEALTHY',
    totalIssues: 10,
    dimensions: {
      schedule: EMPTY_DIMENSION,
      delivery: EMPTY_DIMENSION,
      scope: EMPTY_DIMENSION,
      capacity: EMPTY_DIMENSION,
      dependencies: EMPTY_DIMENSION,
    },
  };
}

describe('buildTrendSeries (§19)', () => {
  it('maps stored snapshots to date/healthScore points, preserving order', () => {
    const snapshots = [snapshot('2026-08-10', 78), snapshot('2026-08-11', 71)];

    expect(buildTrendSeries(snapshots)).toEqual([
      { date: '2026-08-10', healthScore: 78 },
      { date: '2026-08-11', healthScore: 71 },
    ]);
  });
});

describe('computeTrendDirection (§7 Trend column)', () => {
  it('returns the placeholder when there is no current health score', () => {
    expect(computeTrendDirection(null, [snapshot('2026-08-08', 80)], NOW)).toBe(TREND_PLACEHOLDER);
  });

  it('returns the placeholder when there is no snapshot as of ~7 days ago', () => {
    expect(computeTrendDirection(80, [], NOW)).toBe(TREND_PLACEHOLDER);
  });

  it('returns the placeholder when the closest past snapshot has a null health score', () => {
    const snapshots = [snapshot('2026-08-08', null)];
    expect(computeTrendDirection(80, snapshots, NOW)).toBe(TREND_PLACEHOLDER);
  });

  it('returns ↑ when the current score improved over the snapshot ~7 days ago', () => {
    const snapshots = [snapshot('2026-08-08', 70)];
    expect(computeTrendDirection(85, snapshots, NOW)).toBe('↑');
  });

  it('returns ↓ when the current score dropped from the snapshot ~7 days ago', () => {
    const snapshots = [snapshot('2026-08-08', 78)];
    expect(computeTrendDirection(42, snapshots, NOW)).toBe('↓');
  });

  it('returns → when the current score matches the snapshot ~7 days ago', () => {
    const snapshots = [snapshot('2026-08-08', 61)];
    expect(computeTrendDirection(61, snapshots, NOW)).toBe('→');
  });

  it('picks the snapshot closest to (but not after) 7 days ago when history has gaps', () => {
    // 7 days before NOW is 2026-08-08; only 08-06 and 08-12 exist. 08-06 is the
    // latest one at or before the target date, so it's the comparison point.
    const snapshots = [snapshot('2026-08-01', 90), snapshot('2026-08-06', 50), snapshot('2026-08-12', 20)];
    expect(computeTrendDirection(60, snapshots, NOW)).toBe('↑');
  });
});

describe('formatTrendLine (§16 trend line)', () => {
  it('returns the placeholder for an empty series', () => {
    expect(formatTrendLine([])).toBe(TREND_PLACEHOLDER);
  });

  it('joins health scores oldest-to-newest with the §16 arrow separator', () => {
    const points = [78, 71, 64, 55, 42].map((healthScore, i) => ({
      date: `2026-08-${11 + i}`,
      healthScore,
    }));

    expect(formatTrendLine(points)).toBe('78 → 71 → 64 → 55 → 42');
  });

  it('shows N/A for points with no health score instead of dropping them', () => {
    const points = [
      { date: '2026-08-11', healthScore: 78 },
      { date: '2026-08-12', healthScore: null },
    ];

    expect(formatTrendLine(points)).toBe('78 → N/A');
  });
});

describe('computeDeterioration (§18 Attention Queue)', () => {
  it('returns null when there is no current health score', () => {
    expect(computeDeterioration(null, [snapshot('2026-08-01', 80)], NOW)).toBeNull();
  });

  it('returns null when there is no snapshot as of ~14 days ago', () => {
    expect(computeDeterioration(42, [], NOW)).toBeNull();
  });

  it('returns null when the closest past snapshot has a null health score', () => {
    const snapshots = [snapshot('2026-08-01', null)];
    expect(computeDeterioration(42, snapshots, NOW)).toBeNull();
  });

  it('returns a negative delta when the project got worse (§18 example: 61 → 42)', () => {
    const snapshots = [snapshot('2026-08-01', 61)];
    expect(computeDeterioration(42, snapshots, NOW)).toBe(-19);
  });

  it('returns a positive delta when the project improved', () => {
    const snapshots = [snapshot('2026-08-01', 61)];
    expect(computeDeterioration(70, snapshots, NOW)).toBe(9);
  });

  it('returns 0 when the score is unchanged', () => {
    const snapshots = [snapshot('2026-08-01', 61)];
    expect(computeDeterioration(61, snapshots, NOW)).toBe(0);
  });
});

describe('formatDeterioration (§18: "↓ -19 in 14 days")', () => {
  it('returns null when there is no comparison point', () => {
    expect(formatDeterioration(null)).toBeNull();
  });

  it('formats the §18 example', () => {
    expect(formatDeterioration(-19)).toBe('↓ -19 in 14 days');
  });

  it('formats an improvement with a leading +', () => {
    expect(formatDeterioration(9)).toBe('↑ +9 in 14 days');
  });

  it('formats no change with the flat arrow', () => {
    expect(formatDeterioration(0)).toBe('→ 0 in 14 days');
  });
});
