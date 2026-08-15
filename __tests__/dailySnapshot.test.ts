jest.mock('@forge/api', () => ({ asApp: jest.fn() }));
jest.mock('../src/storage/configStore', () => ({ getConfig: jest.fn() }));
jest.mock('../src/health/analyzeProject', () => ({ analyzeProject: jest.fn() }));
jest.mock('../src/storage/snapshotStore', () => ({ saveSnapshot: jest.fn(), getSnapshots: jest.fn() }));
jest.mock('../src/storage/alertStore', () => ({ appendAlerts: jest.fn() }));

import { asApp } from '@forge/api';
import { getConfig } from '../src/storage/configStore';
import { analyzeProject } from '../src/health/analyzeProject';
import { saveSnapshot, getSnapshots } from '../src/storage/snapshotStore';
import { appendAlerts } from '../src/storage/alertStore';
import { run } from '../src/triggers/dailySnapshot';
import { DimensionResult } from '../src/metrics/model';
import { DEFAULT_THRESHOLDS } from '../src/storage/configStore';

const mockedAsApp = asApp as jest.Mock;
const mockedGetConfig = getConfig as jest.Mock;
const mockedAnalyzeProject = analyzeProject as jest.Mock;
const mockedSaveSnapshot = saveSnapshot as jest.Mock;
const mockedGetSnapshots = getSnapshots as jest.Mock;
const mockedAppendAlerts = appendAlerts as jest.Mock;

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
    mockedGetSnapshots.mockResolvedValue([]);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockedGetConfig.mockReset();
    mockedAnalyzeProject.mockReset();
    mockedSaveSnapshot.mockReset();
    mockedGetSnapshots.mockReset();
    mockedAppendAlerts.mockReset();
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

  describe('alert evaluation (Tarea 6.1.c)', () => {
    it('evaluates the new snapshot against the one fetched before saving, and persists any alert that fires', async () => {
      mockedGetConfig.mockResolvedValue({
        selectedProjectKeys: ['KAN'],
        thresholds: DEFAULT_THRESHOLDS,
        baselinePolicy: 'first-snapshot',
      });
      mockedAnalyzeProject.mockResolvedValue({ ...successOutcome('KAN'), healthScore: 65, status: 'AT_RISK' });
      mockedGetSnapshots.mockResolvedValue([
        {
          projectKey: 'KAN',
          date: '2026-08-14',
          healthScore: 90,
          status: 'HEALTHY',
          totalIssues: 5,
          dimensions: successOutcome('KAN').dimensions,
        },
      ]);

      await run();

      expect(mockedGetSnapshots).toHaveBeenCalledWith('KAN', 1);
      expect(mockedAppendAlerts).toHaveBeenCalledTimes(1);
      const [projectKey, alerts] = mockedAppendAlerts.mock.calls[0];
      expect(projectKey).toBe('KAN');
      expect(alerts.map((a: { code: string }) => a.code)).toEqual(
        expect.arrayContaining(['HEALTH_DROP', 'HEALTHY_TO_AT_RISK'])
      );
    });

    it('does not persist alerts when no rule fires', async () => {
      mockedGetConfig.mockResolvedValue({
        selectedProjectKeys: ['KAN'],
        thresholds: DEFAULT_THRESHOLDS,
        baselinePolicy: 'first-snapshot',
      });
      mockedAnalyzeProject.mockResolvedValue(successOutcome('KAN'));
      mockedGetSnapshots.mockResolvedValue([]);

      await run();

      expect(mockedAppendAlerts).not.toHaveBeenCalled();
    });

    it('fetches the previous snapshot before overwriting it, for every project independently', async () => {
      mockedGetConfig.mockResolvedValue({
        selectedProjectKeys: ['KAN', 'OPS'],
        thresholds: DEFAULT_THRESHOLDS,
        baselinePolicy: 'first-snapshot',
      });
      mockedAnalyzeProject.mockImplementation((_api, projectKey: string) =>
        Promise.resolve(successOutcome(projectKey))
      );
      mockedGetSnapshots.mockResolvedValue([]);

      await run();

      expect(mockedGetSnapshots).toHaveBeenCalledWith('KAN', 1);
      expect(mockedGetSnapshots).toHaveBeenCalledWith('OPS', 1);
    });
  });
});
