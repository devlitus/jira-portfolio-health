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

export const handler = resolver.getDefinitions();
