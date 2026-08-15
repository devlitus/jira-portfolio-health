// Daily scheduled trigger handler (manifest: jira:scheduledTrigger,
// Tarea 5.2). Runs once a day with no interactive user attached — it wires
// the existing analysis pipeline (Tarea 3.5) to the Snapshot Service
// (Tarea 5.1): for every selected project, analyze it and persist the
// result as today's snapshot.
//
// Authenticates via asApp() rather than asUser() (docs/architecture-decisions.md
// #3): that decision covers interactive resolvers, which run on behalf of the
// user viewing the dashboard, but a scheduled trigger has no user context to
// impersonate. analyzeProject()/getProjectIssues() only need `requestJira`,
// which AsAppFetchMethods provides just like AsUserFetchMethods does.
//
// Idempotent by construction: saveSnapshot() writes to the fixed key
// `snapshot:<projectKey>:<yyyy-mm-dd>` (Tarea 5.1.a), so re-running this
// trigger for the same day overwrites the same entry instead of duplicating
// it (Tarea 5.2 "seguro ante re-ejecuciones").
//
// Logs are limited to project key + timings (§25): never an issue summary,
// description, or other issue content — only the outcome (saved / skipped)
// and how long it took.

import { asApp } from '@forge/api';
import { getConfig } from '../storage/configStore';
import { analyzeProject } from '../health/analyzeProject';
import { saveSnapshot } from '../storage/snapshotStore';
import type { StoredSnapshot } from '../storage/snapshotStore';

export const run = async (): Promise<void> => {
  const start = Date.now();
  const config = await getConfig();
  const api = asApp();

  await Promise.all(
    config.selectedProjectKeys.map(async (projectKey) => {
      const projectStart = Date.now();
      const outcome = await analyzeProject(api, projectKey, { thresholds: config.thresholds });
      const elapsedMs = Date.now() - projectStart;

      if (!outcome.ok) {
        console.log(`dailySnapshot: analysis failed for ${projectKey} (${elapsedMs}ms)`);
        return;
      }

      const storedSnapshot: StoredSnapshot = {
        projectKey: outcome.projectKey,
        date: outcome.date,
        healthScore: outcome.healthScore,
        status: outcome.status,
        dimensions: outcome.dimensions,
        totalIssues: outcome.totalIssues,
      };

      await saveSnapshot(projectKey, storedSnapshot);
      console.log(`dailySnapshot: saved snapshot for ${projectKey} (${elapsedMs}ms)`);
    })
  );

  console.log(
    `dailySnapshot: completed ${config.selectedProjectKeys.length} project(s) in ${Date.now() - start}ms`
  );
};
