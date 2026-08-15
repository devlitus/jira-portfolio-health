// Project Detail (Tarea 4.3, §16). Pure function that turns one selected
// project's latest cached analysis (same KVS-backed input as the Portfolio
// overview, Tarea 4.1) into the Project Detail screen's data: health status,
// per-dimension scores (§12/§24 "N/A — Insufficient data" for null
// dimensions), factors ordered by impact ("Why?", §16) and the top
// recommendations already computed by the Recommendation Engine (Tarea 3.4).
// No I/O here — the resolver (src/index.ts) is the only thing that touches KVS.

import { HealthFactor, HealthStatus } from '../metrics/model';
import { DashboardEntry } from './dashboard';
import { getStatus } from './status';
import { DEFAULT_THRESHOLDS } from '../storage/configStore';
import { Recommendation } from './recommendations';

// Trend requires historical snapshots, which don't exist until Fase 5
// (Tarea 5.3) — same placeholder used by the Portfolio overview (Tarea 4.1.d).
const TREND_PLACEHOLDER = '—';
const NO_ANALYSIS_REASON = 'No analysis yet — run analysis to see this project.';

export type DimensionName = 'schedule' | 'delivery' | 'scope' | 'capacity' | 'dependencies';

const DIMENSION_ORDER: DimensionName[] = ['schedule', 'delivery', 'scope', 'capacity', 'dependencies'];

export interface DimensionDetail {
  name: DimensionName;
  score: number | null;
  /** Reuses the §14 status thresholds so a dimension's color band matches the overall health score's (null when the dimension itself is null — §12 "N/A — Insufficient data"). */
  status: HealthStatus | null;
  factors: HealthFactor[];
}

export interface ProjectDetail {
  projectKey: string;
  projectName: string;
  healthScore: number | null;
  status: HealthStatus | null;
  trend: string;
  dimensions: DimensionDetail[];
  /** All factors across dimensions, ordered by impact (largest penalty first) — the "Why?" list (§16). */
  factors: HealthFactor[];
  /** Top recommendations from the Recommendation Engine (Tarea 3.4), already capped at 3. */
  recommendations: Recommendation[];
  /** Present when there's no analysis to show (never ran, or the last run failed). */
  reason?: string;
}

/**
 * Builds the Project Detail screen (§16) for one project from its latest
 * cached analysis. Returns `reason` instead of scores when there's nothing to
 * show yet — mirrors the Portfolio overview's own no-analysis handling
 * (Tarea 4.1's `toRow`).
 */
export function buildProjectDetail(entry: DashboardEntry): ProjectDetail {
  const { project, outcome } = entry;

  if (!outcome || !outcome.ok) {
    return {
      projectKey: project.key,
      projectName: project.name,
      healthScore: null,
      status: null,
      trend: TREND_PLACEHOLDER,
      dimensions: DIMENSION_ORDER.map((name) => ({ name, score: null, status: null, factors: [] })),
      factors: [],
      recommendations: [],
      reason: outcome && !outcome.ok ? outcome.reason : NO_ANALYSIS_REASON,
    };
  }

  const dimensions: DimensionDetail[] = DIMENSION_ORDER.map((name) => {
    const dimension = outcome.dimensions[name];
    return {
      name,
      score: dimension.score,
      status: dimension.score === null ? null : getStatus(dimension.score, DEFAULT_THRESHOLDS),
      factors: dimension.factors,
    };
  });

  const factors = dimensions.flatMap((dimension) => dimension.factors).sort((a, b) => a.impact - b.impact);

  return {
    projectKey: project.key,
    projectName: project.name,
    healthScore: outcome.healthScore,
    status: outcome.status,
    trend: TREND_PLACEHOLDER,
    dimensions,
    factors,
    recommendations: outcome.recommendations,
  };
}
