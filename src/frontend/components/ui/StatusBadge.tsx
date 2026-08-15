// Status Chip compartido (Tarea A.3): consolida las copias duplicadas de
// STATUS_LABELS/STATUS_COLORS/StatusBadge que vivían en Dashboard.tsx y
// ProjectDetail.tsx. Estilo "Status Chip" de DESIGN.md § Components: fondo
// sólido, texto blanco, label-bold uppercase.
import React from 'react';
import type { HealthStatus } from '../../../metrics/model';

const STATUS_LABELS: Record<HealthStatus, string> = {
  HEALTHY: 'Healthy',
  AT_RISK: 'At Risk',
  CRITICAL: 'Critical',
};

const STATUS_BG: Record<HealthStatus, string> = {
  HEALTHY: 'bg-status-healthy',
  AT_RISK: 'bg-status-at-risk',
  CRITICAL: 'bg-status-critical',
};

export interface StatusBadgeProps {
  status: HealthStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => (
  <span
    className={`inline-block rounded px-2 py-1 font-label-bold text-label-bold uppercase tracking-wider text-white ${STATUS_BG[status]}`}
  >
    {STATUS_LABELS[status]}
  </span>
);
