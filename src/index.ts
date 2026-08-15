// Resolver bridge between the Custom UI frontend and the backend (Tarea 1.5).
// The frontend never talks to Jira directly (docs/architecture-decisions.md #3)
// — every function here is called from src/frontend via `invoke()` (@forge/bridge).

import Resolver from '@forge/resolver';
import { asUser } from '@forge/api';
import { listProjects } from './jira/client';
import { getConfig, saveConfig } from './storage/configStore';
import type { PortfolioConfig, PortfolioConfigInput } from './storage/configStore';
import type { Project } from './metrics/model';

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

export const handler = resolver.getDefinitions();
