// Trend Indicator circular (Tarea A.3, DESIGN.md § Components): convierte
// el string de tendencia de src/health/trend.ts (↑/↓/→/—) en un badge
// circular con color semántico. Verde para ↑, ámbar para → (estancado),
// rojo para ↓; el placeholder — se muestra en gris neutro sin flecha.
import React from 'react';
import { ArrowDownIcon, ArrowForwardIcon, ArrowUpIcon } from './icons';

export interface TrendBadgeProps {
  trend: string;
}

const TREND_UP = '↑';
const TREND_DOWN = '↓';
const TREND_FLAT = '→';

export const TrendBadge: React.FC<TrendBadgeProps> = ({ trend }) => {
  if (trend === TREND_UP) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-status-healthy/10 text-status-healthy">
        <ArrowUpIcon size={16} />
      </span>
    );
  }
  if (trend === TREND_DOWN) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-status-critical/10 text-status-critical">
        <ArrowDownIcon size={16} />
      </span>
    );
  }
  if (trend === TREND_FLAT) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-status-at-risk/10 text-status-at-risk">
        <ArrowForwardIcon size={16} />
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-container text-body-sm text-on-surface-variant">
      {trend}
    </span>
  );
};
