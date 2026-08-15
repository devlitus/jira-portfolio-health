import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke } from '@forge/bridge';
import { ProjectSelector } from './components/ProjectSelector';
import { Dashboard } from './components/Dashboard';
import { AttentionQueue } from './components/AttentionQueue';
import type { Project } from '../metrics/model';
import type { DashboardSummary } from '../health/dashboard';
import type { AttentionQueueEntry } from '../health/attentionQueue';

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

type Status = 'loading' | 'setup' | 'analyzing' | 'ready' | 'error';

const App: React.FC = () => {
  const [status, setStatus] = useState<Status>('loading');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [attentionQueue, setAttentionQueue] = useState<AttentionQueueEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze the portfolio.');
      setStatus('error');
    }
  }

  if (status === 'loading') {
    return <p>Loading...</p>;
  }

  if (status === 'error') {
    return <p role="alert">{error}</p>;
  }

  if (status === 'analyzing') {
    return (
      <section>
        <h1>Analyzing portfolio...</h1>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {ANALYSIS_STEPS.map((step) => (
            <li key={step}>{'✓'} {step}</li>
          ))}
        </ul>
      </section>
    );
  }

  if (status === 'ready' && dashboard) {
    return (
      <>
        <AttentionQueue entries={attentionQueue} />
        <Dashboard summary={dashboard} />
        <button type="button" onClick={() => setStatus('setup')}>
          Edit selection
        </button>
      </>
    );
  }

  return (
    <ProjectSelector
      projects={projects}
      selectedKeys={selectedKeys}
      onToggle={toggleProject}
      onStartAnalysis={startAnalysis}
    />
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
