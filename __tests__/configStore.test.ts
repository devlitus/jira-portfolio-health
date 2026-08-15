jest.mock('@forge/kvs', () => ({ kvs: { get: jest.fn(), set: jest.fn() } }));

import { kvs } from '@forge/kvs';
import {
  getConfig,
  saveConfig,
  DEFAULT_THRESHOLDS,
  DEFAULT_SCOPE_GROWTH_THRESHOLDS,
  DEFAULT_BASELINE_POLICY,
} from '../src/storage/configStore';

const mockedGet = kvs.get as jest.Mock;
const mockedSet = kvs.set as jest.Mock;

/** In-memory stand-in for KVS so saveConfig()/getConfig() round-trip like the real store. */
function useInMemoryKvs() {
  const store: Record<string, unknown> = {};
  mockedSet.mockImplementation(async (key: string, value: unknown) => {
    store[key] = value;
  });
  mockedGet.mockImplementation(async (key: string) => store[key]);
}

describe('configStore', () => {
  afterEach(() => {
    mockedGet.mockReset();
    mockedSet.mockReset();
  });

  it('returns defaults when no config has been saved yet', async () => {
    mockedGet.mockResolvedValue(undefined);

    const config = await getConfig();

    expect(config).toEqual({
      selectedProjectKeys: [],
      thresholds: DEFAULT_THRESHOLDS,
      baselinePolicy: DEFAULT_BASELINE_POLICY,
    });
    expect(mockedGet).toHaveBeenCalledWith('config:portfolio');
  });

  it('round-trips a fully specified config through saveConfig/getConfig', async () => {
    useInMemoryKvs();
    const custom = {
      selectedProjectKeys: ['KAN', 'OPS'],
      thresholds: { healthy: 85, atRisk: 65, scopeGrowth: { warning: 10, risk: 20, critical: 30 } },
      baselinePolicy: 'first-snapshot' as const,
    };

    await saveConfig(custom);
    const result = await getConfig();

    expect(result).toEqual(custom);
    expect(mockedSet).toHaveBeenCalledWith('config:portfolio', custom);
  });

  it('fills in default thresholds and baselinePolicy when only project selection is saved', async () => {
    useInMemoryKvs();

    await saveConfig({ selectedProjectKeys: ['KAN'] });
    const result = await getConfig();

    expect(result).toEqual({
      selectedProjectKeys: ['KAN'],
      thresholds: DEFAULT_THRESHOLDS,
      baselinePolicy: DEFAULT_BASELINE_POLICY,
    });
  });

  it('fills in default scope-growth thresholds when only status thresholds are customized', async () => {
    useInMemoryKvs();

    await saveConfig({ selectedProjectKeys: [], thresholds: { healthy: 90, atRisk: 70 } });
    const result = await getConfig();

    expect(result.thresholds).toEqual({
      healthy: 90,
      atRisk: 70,
      scopeGrowth: DEFAULT_SCOPE_GROWTH_THRESHOLDS,
    });
  });
});
