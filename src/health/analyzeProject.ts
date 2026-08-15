// Analysis orchestrator (Tarea 3.5). Wires together every module built in
// Fase 1-3 into a single pipeline: Jira client -> normalizer -> metrics ->
// dimension scores -> health score -> status -> recommendations. The result
// is shaped like a ProjectSnapshot (§22) plus recommendations, so it's ready
// to be persisted as a snapshot in Fase 5 and served to the dashboard as-is.
//
// Per-project failures (Jira API errors, missing permissions) never throw —
// they're reported as { ok: false, reason }, the same resilience pattern
// getProjectIssues already uses (Tarea 1.3.c), so a resolver looping over
// the whole portfolio can skip a broken project without aborting the rest
// (§24 Resilience).

import { getProjectIssues, JiraFetchApi } from '../jira/client';
import { normalizeIssue, ProjectSnapshot } from '../metrics/model';
import { computeProjectMetrics } from '../metrics';
import {
  computeScheduleScore,
  computeDeliveryScore,
  computeScopeScore,
  computeCapacityScore,
  computeDependenciesScore,
} from './dimensions';
import { calculateHealthScore } from './score';
import { getStatus } from './status';
import { generateRecommendations, Recommendation } from './recommendations';
import { getBaseline } from '../storage/snapshotStore';
import { DEFAULT_THRESHOLDS, StatusThresholds } from '../storage/configStore';

export interface ProjectAnalysisResult extends ProjectSnapshot {
  recommendations: Recommendation[];
}

export type ProjectAnalysisFailure = { ok: false; projectKey: string; reason: string };
export type ProjectAnalysisSuccess = { ok: true } & ProjectAnalysisResult;
export type ProjectAnalysisOutcome = ProjectAnalysisSuccess | ProjectAnalysisFailure;

export interface AnalyzeProjectOptions {
  storyPointsFieldId?: string;
  thresholds?: Pick<StatusThresholds, 'healthy' | 'atRisk'>;
  now?: Date;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Runs the full analysis pipeline for one project. Never throws: a Jira API
 * failure for this project surfaces as `{ ok: false, reason }` instead of
 * propagating, so the caller (e.g. the `runAnalysis` resolver) can keep
 * analyzing the rest of the portfolio.
 */
export async function analyzeProject(
  api: JiraFetchApi,
  projectKey: string,
  options: AnalyzeProjectOptions = {}
): Promise<ProjectAnalysisOutcome> {
  const now = options.now ?? new Date();
  const thresholds = options.thresholds ?? DEFAULT_THRESHOLDS;

  const issuesResult = await getProjectIssues(api, projectKey, {
    storyPointsFieldId: options.storyPointsFieldId,
  });
  if (!issuesResult.ok) {
    return { ok: false, projectKey, reason: issuesResult.reason };
  }

  const issues = issuesResult.issues.map((issue) => normalizeIssue(issue, options.storyPointsFieldId));
  const baselineScope = await getBaseline(projectKey);
  const metrics = computeProjectMetrics(issues, projectKey, baselineScope, now);

  const dimensions = {
    schedule: computeScheduleScore(metrics.schedule),
    delivery: computeDeliveryScore(metrics.delivery),
    scope: computeScopeScore(metrics.scope),
    capacity: computeCapacityScore(metrics.capacity),
    dependencies: computeDependenciesScore(metrics.dependencies),
  };

  const healthScore = calculateHealthScore({
    schedule: dimensions.schedule.score,
    delivery: dimensions.delivery.score,
    scope: dimensions.scope.score,
    capacity: dimensions.capacity.score,
    dependencies: dimensions.dependencies.score,
  });

  const status = healthScore === null ? null : getStatus(healthScore, thresholds);
  const recommendations = generateRecommendations(metrics, dimensions);

  return {
    ok: true,
    projectKey,
    date: toIsoDate(now),
    healthScore,
    status,
    dimensions,
    recommendations,
  };
}
