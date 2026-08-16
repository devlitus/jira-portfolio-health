import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke } from '@forge/bridge';
import { AppShell, type AppShellView } from './components/AppShell';
import { ProjectSelector } from './components/ProjectSelector';
import { Dashboard } from './components/Dashboard';
import { AttentionQueue } from './components/AttentionQueue';
import { ProjectDetail } from './components/ProjectDetail';
import { RecommendedActions } from './components/RecommendedActions';
import { AnalyticsIcon, WarningIcon } from './components/ui/icons';
import type { Project } from '../metrics/model';
import type { DashboardSummary } from '../health/dashboard';
import type { AttentionQueueEntry } from '../health/attentionQueue';
import type { ProjectDetail as ProjectDetailData } from '../health/projectDetail';
import { buildRecommendedActions, type RecommendedActionItem } from './lib/recommendedActions';

// Custom UI app (see AGENTS.md's "UI approach: Custom UI" override): a plain
// React tree bundled to static files and served by Forge, talking to the
// backend resolver (src/index.ts) via @forge/bridge's `invoke`.

interface PortfolioConfig {
  selectedProjectKeys: string[];
}

// §26 "Loading" screen steps. The real pipeline (Tarea 3.5) now runs behind
// this screen, but its steps aren't individually observable from the
// frontend, so the list is shown as already complete while `runAnalysis` is
// in flight rather than animated.
const ANALYSIS_STEPS = [
  'Loading projects',
  'Reading issues',
  'Calculating metrics',
  'Calculating health',
  'Saving baseline',
];

type Status = 'loading' | 'setup' | 'analyzing' | 'ready' | 'detail' | 'recommended' | 'error';

// Spinner compartido entre 'loading' y 'analyzing' (Tarea F.2). Definido aquí
// en vez de en components/ui/ porque solo se usa en este archivo (ver DoD:
// "sin nuevos archivos compartidos, uso único").
const Spinner: React.FC<{ label: string }> = ({ label }) => (
  <div
    role="status"
    aria-label={label}
    className="h-10 w-10 animate-spin rounded-full border-4 border-outline-variant border-t-primary"
  />
);

const App: React.FC = () => {
  const [status, setStatus] = useState<Status>('loading');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [attentionQueue, setAttentionQueue] = useState<AttentionQueueEntry[]>([]);
  const [projectDetail, setProjectDetail] = useState<ProjectDetailData | null>(null);
  const [recommendedActions, setRecommendedActions] = useState<RecommendedActionItem[] | null>(null);
  // Adaptación 5: session-only state, `${projectKey}:${code}` keys, lost on reload — no KVS/resolver for this yet.
  const [reviewedKeys, setReviewedKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isRerunning, setIsRerunning] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialState() {
      try {
        const [fetchedProjects, config] = await Promise.all([
          invoke('getProjects') as Promise<Project[]>,
          invoke('getConfig') as Promise<PortfolioConfig>,
        ]);
        if (cancelled) return;

        setProjects(fetchedProjects);
        setSelectedKeys(new Set(config.selectedProjectKeys));

        if (config.selectedProjectKeys.length > 0) {
          const [summary, queue] = await Promise.all([
            invoke('getDashboard') as Promise<DashboardSummary>,
            invoke('getAttentionQueue') as Promise<AttentionQueueEntry[]>,
          ]);
          if (cancelled) return;
          setDashboard(summary);
          setAttentionQueue(queue);
          setStatus('ready');
        } else {
          setStatus('setup');
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load portfolio setup.');
        setStatus('error');
      }
    }

    loadInitialState();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetches recommendations lazily the first time the user reaches the
  // screen (Tarea D.2) — `recommendedActions` starts `null` and is reset to
  // `null` by startAnalysis/rerunAnalysis, so this only re-fires after a
  // fresh analysis, not on every re-visit while the data is still populated.
  useEffect(() => {
    if (status !== 'recommended' || recommendedActions !== null || !dashboard) return;
    const { projects } = dashboard;
    let cancelled = false;

    async function loadRecommendedActions() {
      try {
        const details = await Promise.all(
          projects.map(
            (project) => invoke('getProjectDetail', { projectKey: project.projectKey }) as Promise<ProjectDetailData>
          )
        );
        if (cancelled) return;
        setRecommendedActions(buildRecommendedActions(details));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load recommended actions.');
        setStatus('error');
      }
    }

    loadRecommendedActions();
    return () => {
      cancelled = true;
    };
  }, [status, recommendedActions, dashboard]);

  function toggleReviewed(projectKey: string, code: string) {
    const key = `${projectKey}:${code}`;
    setReviewedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleProject(projectKey: string) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(projectKey)) {
        next.delete(projectKey);
      } else {
        next.add(projectKey);
      }
      return next;
    });
  }

  function toggleAllProjects() {
    setSelectedKeys((current) =>
      current.size === projects.length ? new Set() : new Set(projects.map((project) => project.key)),
    );
  }

  async function startAnalysis() {
    setStatus('analyzing');
    try {
      const config = (await invoke('saveConfig', {
        selectedProjectKeys: Array.from(selectedKeys),
      })) as PortfolioConfig;
      setSelectedKeys(new Set(config.selectedProjectKeys));
      await invoke('runAnalysis');
      const [summary, queue] = await Promise.all([
        invoke('getDashboard') as Promise<DashboardSummary>,
        invoke('getAttentionQueue') as Promise<AttentionQueueEntry[]>,
      ]);
      setDashboard(summary);
      setAttentionQueue(queue);
      setRecommendedActions(null);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze the portfolio.');
      setStatus('error');
    }
  }

  async function rerunAnalysis() {
    setIsRerunning(true);
    try {
      await invoke('runAnalysis');
      const [summary, queue] = await Promise.all([
        invoke('getDashboard') as Promise<DashboardSummary>,
        invoke('getAttentionQueue') as Promise<AttentionQueueEntry[]>,
      ]);
      setDashboard(summary);
      setAttentionQueue(queue);
      setRecommendedActions(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-run the analysis.');
      setStatus('error');
    } finally {
      setIsRerunning(false);
    }
  }

  async function selectProject(projectKey: string) {
    try {
      const detail = (await invoke('getProjectDetail', { projectKey })) as ProjectDetailData;
      setProjectDetail(detail);
      setStatus('detail');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project detail.');
      setStatus('error');
    }
  }

  function renderContent() {
    if (status === 'error') {
      return (
        <section
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-error/30 bg-error-container p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <WarningIcon size={20} className="shrink-0 text-on-error-container" />
            <h1 className="font-headline-lg text-headline-lg text-on-error-container">Something went wrong</h1>
          </div>
          <p className="font-body-md text-body-md text-on-error-container">{error}</p>
        </section>
      );
    }

    if (status === 'analyzing') {
      return (
        <section className="flex flex-col items-center gap-gutter py-stack-lg">
          <Spinner label="Analyzing portfolio" />
          <div className="text-center">
            <h1 className="font-headline-lg text-headline-lg text-text-heading">Analyzing portfolio...</h1>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              This may take a few moments.
            </p>
          </div>
          <ul className="flex w-full max-w-sm flex-col gap-2 rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
            {ANALYSIS_STEPS.map((step) => (
              <li
                key={step}
                className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant"
              >
                <span className="text-status-healthy">{'✓'}</span> {step}
              </li>
            ))}
          </ul>
        </section>
      );
    }

    if (status === 'detail' && projectDetail) {
      return (
        <ProjectDetail
          detail={projectDetail}
          allProjects={dashboard?.projects ?? []}
          onSelectProject={selectProject}
          onBack={() => setStatus('ready')}
          onViewRecommendedActions={() => setStatus('recommended')}
        />
      );
    }

    if (status === 'recommended') {
      if (recommendedActions === null) {
        return (
          <section className="flex flex-col items-center gap-gutter py-stack-lg">
            <Spinner label="Loading recommended actions" />
            <p className="font-body-md text-body-md text-on-surface-variant">Loading recommended actions...</p>
          </section>
        );
      }

      return (
        <RecommendedActions items={recommendedActions} reviewedKeys={reviewedKeys} onToggleReviewed={toggleReviewed} />
      );
    }

    if (status === 'ready' && dashboard) {
      return (
        <>
          <AttentionQueue entries={attentionQueue} onSelectProject={selectProject} />
          <Dashboard
            summary={dashboard}
            onSelectProject={selectProject}
            onRerunAnalysis={rerunAnalysis}
            isRerunning={isRerunning}
          />
        </>
      );
    }

    return (
      <ProjectSelector
        projects={projects}
        selectedKeys={selectedKeys}
        onToggle={toggleProject}
        onToggleAll={toggleAllProjects}
        onStartAnalysis={startAnalysis}
      />
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface-slate">
        <AnalyticsIcon size={32} className="text-primary" />
        <Spinner label="Loading" />
        <p className="font-body-md text-body-md text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  // Adaptación 4: "Dashboard" y "Recommended Actions" solo navegan si ya hay
  // un análisis (`dashboard` existe); "Setup" reusa la lógica del antiguo
  // botón "Edit selection" (setStatus('setup') sin condiciones). `detail` no
  // tiene tab propio: sigue resolviendo a 'dashboard' (Tarea B.1).
  const appShellView: AppShellView =
    status === 'recommended' ? 'recommended' : status === 'setup' ? 'configuration' : 'dashboard';

  return (
    <AppShell
      activeView={appShellView}
      onNavigateDashboard={() => {
        if (dashboard) {
          setStatus('ready');
        }
      }}
      onNavigateRecommended={() => {
        if (dashboard) {
          setStatus('recommended');
        }
      }}
      onNavigateConfiguration={() => setStatus('setup')}
    >
      {renderContent()}
    </AppShell>
  );
};

// Mount the React tree into the <div id="root"> element of index.html.
const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
