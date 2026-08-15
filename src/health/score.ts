// Health Score formula (§8, §23). Pure function, no I/O — combines the 5
// dimension scores (computed in Tarea 3.2) into a single 0-100 score.
// Uses the "alternative" weighting recommended by the spec (Schedule 30%,
// Delivery 25%, Scope 15%, Capacity 15%, Dependencies 15%; no Risk Buffer).

export interface DimensionScores {
  schedule: number | null;
  delivery: number | null;
  scope: number | null;
  capacity: number | null;
  dependencies: number | null;
}

const DIMENSION_WEIGHTS: Record<keyof DimensionScores, number> = {
  schedule: 0.3,
  delivery: 0.25,
  scope: 0.15,
  capacity: 0.15,
  dependencies: 0.15,
};

/**
 * Weighted average of the available dimension scores. A `null` dimension
 * (missing data, §24 Resilience) is left out of the average entirely and its
 * weight is redistributed proportionally across the remaining dimensions —
 * so a project is never penalized just because one dimension couldn't be
 * computed. Returns `null` only when every dimension is `null` (nothing to
 * score at all).
 */
export function calculateHealthScore(scores: DimensionScores): number | null {
  const dimensions = Object.keys(DIMENSION_WEIGHTS) as (keyof DimensionScores)[];
  const available = dimensions.filter((dimension) => scores[dimension] !== null);

  if (available.length === 0) return null;

  const availableWeight = available.reduce((sum, dimension) => sum + DIMENSION_WEIGHTS[dimension], 0);

  const weightedSum = available.reduce((sum, dimension) => {
    const redistributedWeight = DIMENSION_WEIGHTS[dimension] / availableWeight;
    return sum + (scores[dimension] as number) * redistributedWeight;
  }, 0);

  return Math.min(100, Math.max(0, Math.round(weightedSum)));
}
