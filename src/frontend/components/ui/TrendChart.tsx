// TrendChart (Tarea E.2, Fase E de `docs/plans/vivid-marching-otter.md`):
// mini gráfico de línea SVG inline, sin librería externa, a partir del
// string ya formateado por `formatTrendLine` (`src/health/trend.ts`, ej.
// "78 → 71 → 64 → 55 → 42"). Ignora tokens `N/A`/el placeholder `—` — un
// punto sin dato no se lee como 0 (mismo invariante de "no penalizar datos
// faltantes" que el resto del motor de salud).
import React from 'react';

interface TrendChartProps {
  trend: string;
}

const VIEW_WIDTH = 500;
const VIEW_HEIGHT = 120;
const PADDING_Y = 16;

function parsePoints(trend: string): number[] {
  return trend
    .split('→')
    .map((token) => token.trim())
    .filter((token) => token !== '' && token !== 'N/A' && token !== '—')
    .map(Number)
    .filter((value) => !Number.isNaN(value));
}

export const TrendChart: React.FC<TrendChartProps> = ({ trend }) => {
  const points = parsePoints(trend);

  if (points.length < 2) {
    return (
      <p className="p-6 text-center font-body-sm text-body-sm text-on-surface-variant">Not enough history yet</p>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min;

  const coords = points.map((value, index) => ({
    x: (index / (points.length - 1)) * VIEW_WIDTH,
    y:
      range === 0
        ? VIEW_HEIGHT / 2
        : VIEW_HEIGHT - PADDING_Y - ((value - min) / range) * (VIEW_HEIGHT - 2 * PADDING_Y),
    value,
  }));

  const polylinePoints = coords.map(({ x, y }) => `${x},${y}`).join(' ');

  return (
    <div className="p-4">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-24 w-full overflow-visible"
        role="img"
        aria-label={`Health score trend: ${trend}`}
      >
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--color-primary-container)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map(({ x, y }, index) => (
          <circle key={index} cx={x} cy={y} r={4} fill="var(--color-primary-container)" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between">
        {coords.map(({ value }, index) => (
          <span key={index} className="font-data-mono text-data-mono text-on-surface-variant">
            {value}
          </span>
        ))}
      </div>
    </div>
  );
};
