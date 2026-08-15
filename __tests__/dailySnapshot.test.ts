jest.mock('@forge/api', () => ({ asApp: jest.fn() }));
jest.mock('../src/storage/configStore', () => ({ getConfig: jest.fn() }));
jest.mock('../src/health/analyzeProject', () => ({ analyzeProject: jest.fn() }));
jest.mock('../src/storage/snapshotStore', () => ({ saveSnapshot: jest.fn() }));

import { asApp } from '@forge/api';
import { getConfig } from '../src/storage/configStore';
import { analyzeProject } from '../src/health/analyzeProject';
import { saveSnapshot } from '../src/storage/snapshotStore';
import { run } from '../src/triggers/dailySnapshot';
import { DimensionResult } from '../src/metrics/model';
import { DEFAULT_THRESHOLDS } from '../src/storage/configStore';

const mockedAsApp = asApp as jest.Mock;
const mockedGetConfig = getConfig as jest.Mock;
const mockedAnalyzeProject = analyzeProject as jest.Mock;
const mockedSaveSnapshot = saveSnapshot as jest.Mock;

const EMPTY_DIMENSION: DimensionResult = { score: null, factors: [] };
const fakeApi = { requestJira: jest.fn() };

function successOutcome(projectKey: string, totalIssues = 5) {
  return {
    ok: true,
    projectKey,
    date: '2026-08-15',
    healthScore: 90,
    status: 'HEALTHY',
    dimensions: {
      schedule: EMPTY_DIMENSION,
      delivery: EMPTY_DIMENSION,
      scope: EMPTY_DIMENSION,
      capacity: EMPTY_DIMENSION,
      dependencies: EMPTY_DIMENSION,
    },
    totalIssues,
    recommendations: [],
  };
}

describe('dailySnapshot trigger', () => {
  beforeEach(() => {
    mockedAsApp.mockReturnValue(fakeApi);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockedGetConfig.mockReset();
    mockedAnalyzeProject.mockReset();
    mockedSaveSnapshot.mockReset();
  });

  it('analyzes every selected project as the app and saves a snapshot per success', async () => {
    mockedGetConfig.mockResolvedValue({
      selectedProjectKeys: ['KAN', 'OPS'],
      thresholds: DEFAULT_THRESHOLDS,
      baselinePolicy: 'first-snapshot',
    });
    mockedAnalyzeProject.mockImplementation((_api, projectKey: string) =>
      Promise.resolve(successOutcome(projectKey))
    );

    await run();

    expect(mockedAsApp).toHaveBeenCalled();
    expect(mockedAnalyzeProject).toHaveBeenCalledWith(fakeApi, 'KAN', { thresholds: DEFAULT_THRESHOLDS });
    expect(mockedAnalyzeProject).toHaveBeenCalledWith(fakeApi, 'OPS', { thresholds: DEFAULT_THRESHOLDS });
    expect(mockedSaveSnapshot).toHaveBeenCalledTimes(2);
    expect(mockedSaveSnapshot).toHaveBeenCalledWith('KAN', {
      projectKey: 'KAN',
      date: '2026-08-15',
      healthScore: 90,
      status: 'HEALTHY',
      dimensions: successOutcome('KAN').dimensions,
      totalIssues: 5,
    });
  });

  it('skips saving a snapshot for a project whose analysis failed, without aborting the rest', async () => {
    mockedGetConfig.mockResolvedValue({
      selectedProjectKeys: ['KAN', 'BROKEN'],
      thresholds: DEFAULT_THRESHOLDS,
      baselinePolicy: 'first-snapshot',
    });
    mockedAnalyzeProject.mockImplementation((_api, projectKey: string) =>
      projectKey === 'BROKEN'
        ? Promise.resolve({ ok: false, projectKey, reason: 'Jira API returned 403 Forbidden for project BROKEN' })
        : Promise.resolve(successOutcome(projectKey))
    );

    await run();

    expect(mockedSaveSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedSaveSnapshot).toHaveBeenCalledWith('KAN', expect.objectContaining({ projectKey: 'KAN' }));
  });

  it('does nothing but log when no project is selected', async () => {
    mockedGetConfig.mockResolvedValue({
      selectedProjectKeys: [],
      thresholds: DEFAULT_THRESHOLDS,
      baselinePolicy: 'first-snapshot',
    });

    await run();

    expect(mockedAnalyzeProject).not.toHaveBeenCalled();
    expect(mockedSaveSnapshot).not.toHaveBeenCalled();
  });

  it('never logs issue content — only project keys and timings', async () => {
    mockedGetConfig.mockResolvedValue({
      selectedProjectKeys: ['KAN'],
      thresholds: DEFAULT_THRESHOLDS,
      baselinePolicy: 'first-snapshot',
    });
    mockedAnalyzeProject.mockResolvedValue(successOutcome('KAN'));

    await run();

    const loggedText = (console.log as jest.Mock).mock.calls.map((call) => call.join(' ')).join('\n');
    expect(loggedText).toContain('KAN');
    expect(loggedText).not.toMatch(/summary|description/i);
  });
});
