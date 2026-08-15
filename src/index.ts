// Resolver bridge between the Custom UI frontend and the backend (Tarea 1.5).
// The frontend never talks to Jira directly (docs/architecture-decisions.md #3)
// — every function here is called from src/frontend via `invoke()` (@forge/bridge).

import Resolver from '@forge/resolver';
import { asUser } from '@forge/api';
import { kvs } from '@forge/kvs';
import { listProjects } from './jira/client';
import { getConfig, saveConfig } from './storage/configStore';
import type { PortfolioConfig, PortfolioConfigInput } from './storage/configStore';
import type { Project } from './metrics/model';
import { analyzeProject } from './health/analyzeProject';
import type { ProjectAnalysisOutcome } from './health/analyzeProject';
import { buildDashboardSummary } from './health/dashboard';
import type { DashboardEntry, DashboardSummary } from './health/dashboard';
import { buildAttentionQueue } from './health/attentionQueue';
import type { AttentionQueueEntry } from './health/attentionQueue';
import { buildProjectDetail } from './health/projectDetail';
import type { ProjectDetail } from './health/projectDetail';

const resolver = new Resolver();

resolver.define('getProjects', async (): Promise<Project[]> => {
  return listProjects(asUser());
});

resolver.define('getConfig', async (): Promise<PortfolioConfig> => {
  return getConfig();
});

resolver.define('saveConfig', async (request): Promise<PortfolioConfig> => {
  const payload = request.payload as PortfolioConfigInput;
  await saveConfig(payload);
  return getConfig();
});

/**
 * Runs the full analysis pipeline (Tarea 3.5) for every selected project and
 * caches each successful result at KVS key `latest:<projectKey>`, so the
 * dashboard (Fase 4) can read cached results instead of recomputing on every
 * load (§24 Performance). A per-project failure is returned alongside the
 * successes rather than aborting the whole run (§24 Resilience).
 */
resolver.define('runAnalysis', async (): Promise<ProjectAnalysisOutcome[]> => {
  const config = await getConfig();
  const api = asUser();

  return Promise.all(
    config.selectedProjectKeys.map(async (projectKey) => {
      const result = await analyzeProject(api, projectKey, { thresholds: config.thresholds });
      if (result.ok) {
        await kvs.set(`latest:${projectKey}`, result);
      }
      return result;
    })
  );
});

/**
 * Reads the selected projects' names (Jira, so the UI reflects current
 * project names) and their latest cached analysis (KVS `latest:<projectKey>`,
 * written by `runAnalysis`) — no recomputation, so dashboard-derived views
 * stay fast (§24 Performance). Shared by `getDashboard` (Tarea 4.1) and
 * `getAttentionQueue` (Tarea 4.2), which reduce this same data differently.
 */
async function loadDashboardEntries(): Promise<DashboardEntry[]> {
  const config = await getConfig();
  const allProjects = await listProjects(asUser());
  const projectsByKey = new Map(allProjects.map((project) => [project.key, project]));

  return Promise.all(
    config.selectedProjectKeys.map(async (projectKey) => {
      const project = projectsByKey.get(projectKey) ?? { id: projectKey, key: projectKey, name: projectKey };
      const outcome = await kvs.get<ProjectAnalysisOutcome>(`latest:${projectKey}`);
      return { project, outcome: outcome ?? undefined };
    })
  );
}

/**
 * Portfolio overview (Tarea 4.1): reduces the selected projects' latest
 * cached analysis to the dashboard's executive summary.
 */
resolver.define('getDashboard', async (): Promise<DashboardSummary> => {
  return buildDashboardSummary(await loadDashboardEntries());
});

/**
 * Attention Queue (Tarea 4.2, §18): the same cached analysis as
 * `getDashboard`, reduced to the ordered "Today's Attention" queue
 * (severity DESC, health ASC, recent deterioration DESC).
 */
resolver.define('getAttentionQueue', async (): Promise<AttentionQueueEntry[]> => {
  return buildAttentionQueue(await loadDashboardEntries());
});

/**
 * Project Detail (Tarea 4.3, §16): the selected project's latest cached
 * analysis, reduced to the detail screen's dimensions/factors/recommendations.
 * A `projectKey` outside the current selection (e.g. stale UI state) falls
 * back to the same "no analysis" shape `buildProjectDetail` already returns
 * for a project that was selected but never analyzed.
 */
resolver.define('getProjectDetail', async (request): Promise<ProjectDetail> => {
  const { projectKey } = request.payload as { projectKey: string };
  const entries = await loadDashboardEntries();
  const entry = entries.find(({ project }) => project.key === projectKey);

  return buildProjectDetail(
    entry ?? { project: { id: projectKey, key: projectKey, name: projectKey }, outcome: undefined }
  );
});

export const handler = resolver.getDefinitions();
