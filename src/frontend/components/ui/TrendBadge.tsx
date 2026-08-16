// Trend Indicator (Tarea A.3, DESIGN.md § Components; variant "plain" Tarea
// C.3): convierte el string de tendencia de src/health/trend.ts (↑/↓/→/—) en
// un indicador con color semántico. Verde para ↑, ámbar para → (estancado),
// rojo para ↓; el placeholder — se muestra en gris neutro sin flecha.
// `variant="circle"` (default, usado hoy por AttentionQueue en su forma
// original) dibuja un badge circular con fondo tintado; `variant="plain"`
// (Dashboard "Health by Project", Tarea C.3) muestra solo la flecha coloreada
// sin círculo de fondo, siguiendo el prototipo.
import React from 'react';
import { ArrowDownIcon, ArrowForwardIcon, ArrowUpIcon } from './icons';

export interface TrendBadgeProps {
  trend: string;
  variant?: 'circle' | 'plain';
}

const TREND_UP = '↑';
const TREND_DOWN = '↓';
const TREND_FLAT = '→';

const TREND_ICON: Record<string, React.ReactNode> = {
  [TREND_UP]: <ArrowUpIcon size={16} />,
  [TREND_DOWN]: <ArrowDownIcon size={16} />,
  [TREND_FLAT]: <ArrowForwardIcon size={16} />,
};

const TREND_COLOR_CLASS: Record<string, string> = {
  [TREND_UP]: 'text-status-healthy',
  [TREND_DOWN]: 'text-status-critical',
  [TREND_FLAT]: 'text-status-at-risk',
};

const TREND_CIRCLE_BG_CLASS: Record<string, string> = {
  [TREND_UP]: 'bg-status-healthy/10',
  [TREND_DOWN]: 'bg-status-critical/10',
  [TREND_FLAT]: 'bg-status-at-risk/10',
};

export const TrendBadge: React.FC<TrendBadgeProps> = ({ trend, variant = 'circle' }) => {
  const icon = TREND_ICON[trend] ?? null;
  const colorClass = TREND_COLOR_CLASS[trend] ?? 'text-on-surface-variant';

  if (variant === 'plain') {
    return <span className={colorClass}>{icon ?? trend}</span>;
  }

  const bgClass = TREND_CIRCLE_BG_CLASS[trend] ?? 'bg-surface-container';
  const textClass = icon ? colorClass : 'text-body-sm text-on-surface-variant';
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${bgClass} ${textClass}`}>
      {icon ?? trend}
    </span>
  );
};
