// Project Detail (Tarea 4.3, §16; re-estilizado Tarea E.1). Reads the
// resolver's already-reduced detail (src/health/projectDetail.ts) — no
// computation here, just rendering: header + health, DIMENSIONS, "Why?" and
// "Recommended actions", following the spec's ASCII mockup (§16, §17).
// Sin referencia visual directa del mockup (code.html solo cubre Dashboard,
// plan Fase E) — se extrapolan los mismos tokens/patrones usados en
// Dashboard.tsx y AttentionQueue.tsx (cards `rounded-xl border
// border-outline-variant bg-surface shadow-sm`, cabeceras `bg-surface-slate`,
// divisores suaves `divide-outline-variant/50`). "Why?"/"Recommended
// actions" (Tarea E.2, DESIGN.md § Components "Explainer Tooltips"): cada
// fila lleva un icono `info` enfocable/hoverable que revela un tooltip
// slate-oscuro con el detalle del `HealthFactor` (mensaje + impacto en
// puntos). Las recomendaciones no traen `impact` propio (Recommendation solo
// expone `code`/`message`, Tarea 3.4) pero su `code` coincide con el
// `HealthFactor.code` que las disparó (recommendations.ts § RULES), así que
// el tooltip de cada recomendación busca ese factor en la lista ya calculada
// por el backend en vez de inventar datos.
import React from 'react';
import type { DimensionDetail, DimensionName, ProjectDetail as ProjectDetailData } from '../../health/projectDetail';
import type { DashboardProjectRow } from '../../health/dashboard';
import type { HealthFactor, HealthStatus } from '../../metrics/model';
import type { Recommendation } from '../../health/recommendations';
import { StatusBadge } from './ui/StatusBadge';
import { TrendChart } from './ui/TrendChart';
import {
  CalendarIcon,
  InfoIcon,
  LayersIcon,
  LinkIcon,
  PackageIcon,
  UsersIcon,
  WarningIcon,
  type IconProps,
} from './ui/icons';

interface ProjectDetailProps {
  detail: ProjectDetailData;
  /** Proyectos monitoreados para la tira de pills del selector (Tarea E.1); viene de `dashboard.projects`. */
  allProjects: DashboardProjectRow[];
  onSelectProject: (projectKey: string) => void;
  onBack: () => void;
}

// Tira de pills del selector de proyecto (Tarea E.1) — mismo par
// activo/inactivo que los tabs de AppShell.tsx, pero como pills en vez de
// subrayado (no son navegación de secciones, son selección dentro de la
// misma pantalla).
const PILL_BASE = 'shrink-0 rounded-full px-3 py-1.5 font-label-bold text-label-bold transition-colors';
const PILL_ACTIVE = 'bg-secondary-container text-primary';
const PILL_INACTIVE = 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface';

const ProjectPills: React.FC<{
  projects: DashboardProjectRow[];
  activeProjectKey: string;
  onSelectProject: (projectKey: string) => void;
}> = ({ projects, activeProjectKey, onSelectProject }) => (
  <div className="flex items-center gap-1 overflow-x-auto">
    {projects.map((project) => (
      <button
        key={project.projectKey}
        type="button"
        onClick={() => onSelectProject(project.projectKey)}
        aria-current={project.projectKey === activeProjectKey ? 'true' : undefined}
        className={`${PILL_BASE} ${project.projectKey === activeProjectKey ? PILL_ACTIVE : PILL_INACTIVE}`}
      >
        {project.projectName}
      </button>
    ))}
  </div>
);

const DIMENSION_LABELS: Record<DimensionName, string> = {
  schedule: 'Schedule',
  delivery: 'Delivery',
  scope: 'Scope',
  capacity: 'Capacity',
  dependencies: 'Dependencies',
};

// Tarea E.3: un icono por dimensión (Fase A) en vez del texto plano de antes.
const DIMENSION_ICONS: Record<DimensionName, React.FC<IconProps>> = {
  schedule: CalendarIcon,
  delivery: PackageIcon,
  scope: LayersIcon,
  capacity: UsersIcon,
  dependencies: LinkIcon,
};

// Mismo mapeo status → color que `StatusBadge`/`Dashboard.tsx` (Tarea C.1),
// aplicado al fill de la barra de dimensión en vez de a un badge.
const DIMENSION_BAR_CLASS: Record<HealthStatus, string> = {
  HEALTHY: 'bg-status-healthy',
  AT_RISK: 'bg-status-at-risk',
  CRITICAL: 'bg-status-critical',
};

function formatImpact(impact: number): string {
  const points = Math.abs(impact);
  return `${impact > 0 ? '+' : '-'}${points} pt${points === 1 ? '' : 's'}`;
}

// Grupo `relative` + `group`/`group-focus-within` (mismo patrón que la
// tooltip de la barra Critical/At Risk/Healthy en Dashboard.tsx) para que el
// tooltip funcione tanto con hover como con foco de teclado.
const ExplainerTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="pointer-events-none absolute left-6 top-full z-20 mt-1 w-56 rounded bg-inverse-surface px-3 py-2 font-body-sm text-body-sm text-inverse-on-surface opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
    {children}
  </div>
);

const ExplainerIcon: React.FC<{ label: string }> = ({ label }) => (
  <span tabIndex={0} aria-label={label} className="mt-0.5 shrink-0 cursor-help text-on-surface-variant focus:outline-none">
    <InfoIcon size={16} />
  </span>
);

const FactorRow: React.FC<{ factor: HealthFactor }> = ({ factor }) => (
  <li className="group relative flex items-start gap-2 p-4">
    <ExplainerIcon label={`Why: ${formatImpact(factor.impact)} on the health score`} />
    <span className="font-body-md text-body-md text-on-surface-variant">{factor.message}</span>
    <ExplainerTooltip>{formatImpact(factor.impact)} on the health score.</ExplainerTooltip>
  </li>
);

const RecommendationRow: React.FC<{ recommendation: Recommendation; factors: HealthFactor[] }> = ({
  recommendation,
  factors,
}) => {
  const relatedFactor = factors.find((factor) => factor.code === recommendation.code);
  return (
    <li className="group relative flex items-start gap-2 p-4">
      {relatedFactor ? (
        <>
          <ExplainerIcon label={`Why: ${relatedFactor.message}`} />
          <ExplainerTooltip>
            {relatedFactor.message} ({formatImpact(relatedFactor.impact)})
          </ExplainerTooltip>
        </>
      ) : (
        <InfoIcon size={16} className="mt-0.5 shrink-0 text-on-surface-variant" />
      )}
      <span className="font-body-md text-body-md text-on-surface-variant">{recommendation.message}</span>
    </li>
  );
};

const DimensionRow: React.FC<{ dimension: DimensionDetail }> = ({ dimension }) => {
  const Icon = DIMENSION_ICONS[dimension.name];
  return (
    <li className="flex items-center gap-3 p-4">
      <Icon size={20} className="shrink-0 text-on-surface-variant" />
      <span className="w-28 shrink-0 font-label-bold text-label-bold text-text-heading">
        {DIMENSION_LABELS[dimension.name]}
      </span>
      {dimension.score === null || dimension.status === null ? (
        <span className="flex-1 font-body-sm text-body-sm text-on-surface-variant">N/A — Insufficient data</span>
      ) : (
        <>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-slate">
            <div
              className={`h-full rounded-full ${DIMENSION_BAR_CLASS[dimension.status]}`}
              style={{ width: `${dimension.score}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-data-mono text-data-mono font-bold text-text-heading">
            {dimension.score}
          </span>
        </>
      )}
    </li>
  );
};

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  detail,
  allProjects,
  onSelectProject,
  onBack,
}) => {
  const { projectKey, projectName, healthScore, status, trend, dimensions, factors, recommendations, reason, reasonKind } =
    detail;

  return (
    <section className="flex flex-col gap-gutter">
      <button
        type="button"
        onClick={onBack}
        className="self-start font-label-bold text-label-bold text-primary transition-colors hover:text-primary-container"
      >
        {'←'} All projects
      </button>

      {allProjects.length > 0 && (
        <ProjectPills projects={allProjects} activeProjectKey={projectKey} onSelectProject={onSelectProject} />
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-headline-lg text-headline-lg text-text-heading">{projectName}</h1>
          {status && <StatusBadge status={status} />}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display-hero text-display-hero text-text-heading">
            {healthScore === null ? 'N/A' : healthScore}
          </span>
          <span className="font-headline-lg text-headline-lg text-outline">/100</span>
        </div>
      </section>

      {!reason && (
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <div className="border-b border-outline-variant bg-surface-slate p-4">
            <h2 className="font-headline-sm text-headline-sm uppercase text-text-heading">
              Trend — last 5 snapshots
            </h2>
          </div>
          <TrendChart trend={trend} />
        </section>
      )}

      {reason ? (
        <section
          className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm ${
            reasonKind === 'failed' ? 'border-status-critical/40 bg-error-container/40' : 'border-outline-variant bg-surface'
          }`}
        >
          {reasonKind === 'failed' ? (
            <WarningIcon size={18} className="mt-0.5 shrink-0 text-status-critical" />
          ) : (
            <InfoIcon size={18} className="mt-0.5 shrink-0 text-on-surface-variant" />
          )}
          <p className="font-body-md text-body-md text-on-surface-variant">
            {reasonKind === 'failed' ? `Analysis unavailable — ${reason}` : reason}
          </p>
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
            <div className="border-b border-outline-variant bg-surface-slate p-4">
              <h2 className="font-headline-sm text-headline-sm uppercase text-text-heading">Dimensions</h2>
            </div>
            <ul className="divide-y divide-outline-variant/50">
              {dimensions.map((dimension) => (
                <DimensionRow key={dimension.name} dimension={dimension} />
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
            <div className="border-b border-outline-variant bg-surface-slate p-4">
              <h2 className="font-headline-sm text-headline-sm uppercase text-text-heading">Why?</h2>
            </div>
            {factors.length === 0 ? (
              <p className="p-6 text-center font-body-sm text-body-sm text-on-surface-variant">
                {healthScore === null
                  ? 'N/A — Insufficient data to explain this yet.'
                  : 'No issues found — this project looks healthy.'}
              </p>
            ) : (
              // Ya vienen ordenados por impacto desde buildProjectDetail (§16) — no se reordenan aquí.
              <ol className="divide-y divide-outline-variant/50">
                {factors.map((factor) => (
                  <FactorRow key={factor.code} factor={factor} />
                ))}
              </ol>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
            <div className="border-b border-outline-variant bg-surface-slate p-4">
              <h2 className="font-headline-sm text-headline-sm uppercase text-text-heading">Recommended actions</h2>
            </div>
            {recommendations.length === 0 ? (
              <p className="p-6 text-center font-body-sm text-body-sm text-on-surface-variant">
                No actions needed right now.
              </p>
            ) : (
              <ol className="divide-y divide-outline-variant/50">
                {recommendations.map((recommendation) => (
                  <RecommendationRow key={recommendation.code} recommendation={recommendation} factors={factors} />
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  );
};
