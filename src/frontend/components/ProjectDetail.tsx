// Project Detail (Tarea 4.3, §16). Reads the resolver's already-reduced
// detail (src/health/projectDetail.ts) — no computation here, just
// rendering: header + health, DIMENSIONS, "Why?" and "Recommended actions",
// following the spec's ASCII mockup (§16, §17).
import React from 'react';
import type { DimensionDetail, DimensionName, ProjectDetail as ProjectDetailData } from '../../health/projectDetail';
import type { HealthStatus } from '../../metrics/model';

interface ProjectDetailProps {
  detail: ProjectDetailData;
  onBack: () => void;
}

const STATUS_LABELS: Record<HealthStatus, string> = {
  HEALTHY: 'Healthy',
  AT_RISK: 'At Risk',
  CRITICAL: 'Critical',
};

const STATUS_COLORS: Record<HealthStatus, string> = {
  HEALTHY: '#00875A',
  AT_RISK: '#FF8B00',
  CRITICAL: '#DE350B',
};

const DIMENSION_LABELS: Record<DimensionName, string> = {
  schedule: 'Schedule',
  delivery: 'Delivery',
  scope: 'Scope',
  capacity: 'Capacity',
  dependencies: 'Dependencies',
};

const StatusBadge: React.FC<{ status: HealthStatus }> = ({ status }) => (
  <span style={{ color: STATUS_COLORS[status], fontWeight: 600 }}>{STATUS_LABELS[status]}</span>
);

const DimensionRow: React.FC<{ dimension: DimensionDetail }> = ({ dimension }) => (
  <li>
    {DIMENSION_LABELS[dimension.name]}:{' '}
    {dimension.score === null || dimension.status === null ? (
      'N/A — Insufficient data'
    ) : (
      <>
        {dimension.score} <StatusBadge status={dimension.status} />
      </>
    )}
  </li>
);

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ detail, onBack }) => {
  const { projectName, healthScore, status, trend, dimensions, factors, recommendations, reason } = detail;

  return (
    <section>
      <button type="button" onClick={onBack}>
        {'←'} Back to dashboard
      </button>

      <h1>{projectName}</h1>
      <p>
        Health: {healthScore === null ? 'N/A' : `${healthScore}`}
        {status && (
          <>
            {' '}
            <StatusBadge status={status} />
          </>
        )}
      </p>

      {reason ? (
        <p>{reason}</p>
      ) : (
        <>
          <section>
            <h2>Trend</h2>
            <p>{trend}</p>
          </section>

          <section>
            <h2>Dimensions</h2>
            <ul>
              {dimensions.map((dimension) => (
                <DimensionRow key={dimension.name} dimension={dimension} />
              ))}
            </ul>
          </section>

          <section>
            <h2>Why?</h2>
            {factors.length === 0 ? (
              <p>No issues found — this project looks healthy.</p>
            ) : (
              <ol>
                {factors.map((factor) => (
                  <li key={factor.code}>{factor.message}</li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h2>Recommended actions</h2>
            {recommendations.length === 0 ? (
              <p>No actions needed right now.</p>
            ) : (
              <ol>
                {recommendations.map((recommendation) => (
                  <li key={recommendation.code}>{recommendation.message}</li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  );
};
