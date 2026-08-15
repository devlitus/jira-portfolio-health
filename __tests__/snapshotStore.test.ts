jest.mock('@forge/kvs', () => ({
  kvs: { get: jest.fn(), set: jest.fn(), delete: jest.fn(), query: jest.fn() },
  // Minimal stand-in matching the real @forge/kvs shape: { condition, values }.
  WhereConditions: { beginsWith: (value: string) => ({ condition: 'BEGINS_WITH', values: [value] }) },
}));

import { kvs } from '@forge/kvs';
import {
  saveSnapshot,
  getSnapshots,
  getBaseline,
  pruneExpiredSnapshots,
  StoredSnapshot,
} from '../src/storage/snapshotStore';
import { DimensionResult } from '../src/metrics/model';

const mockedSet = kvs.set as jest.Mock;
const mockedDelete = kvs.delete as jest.Mock;
const mockedQuery = kvs.query as jest.Mock;

const EMPTY_DIMENSION: DimensionResult = { score: null, factors: [] };

function snapshot(projectKey: string, date: string, totalIssues: number, healthScore = 80): StoredSnapshot {
  return {
    projectKey,
    date,
    healthScore,
    status: 'HEALTHY',
    totalIssues,
    dimensions: {
      schedule: EMPTY_DIMENSION,
      delivery: EMPTY_DIMENSION,
      scope: EMPTY_DIMENSION,
      capacity: EMPTY_DIMENSION,
      dependencies: EMPTY_DIMENSION,
    },
  };
}

/**
 * In-memory stand-in for KVS, including prefix queries, so
 * save/get/prune round-trip like the real store (same pattern as
 * configStore.test.ts's useInMemoryKvs, extended with query()).
 */
function useInMemoryKvs() {
  const store: Record<string, unknown> = {};

  mockedSet.mockImplementation(async (key: string, value: unknown) => {
    store[key] = value;
  });
  mockedDelete.mockImplementation(async (key: string) => {
    delete store[key];
  });
  mockedQuery.mockImplementation(() => {
    let prefix = '';
    const builder = {
      where: (_property: 'key', clause: { values: [string] }) => {
        prefix = clause.values[0];
        return builder;
      },
      cursor: () => builder,
      limit: () => builder,
      getMany: async () => ({
        results: Object.entries(store)
          .filter(([key]) => key.startsWith(prefix))
          .map(([key, value]) => ({ key, value })),
      }),
      getOne: async () => undefined,
    };
    return builder;
  });

  return store;
}

describe('snapshotStore', () => {
  afterEach(() => {
    mockedSet.mockReset();
    mockedDelete.mockReset();
    mockedQuery.mockReset();
  });

  describe('saveSnapshot / getSnapshots', () => {
    it('persists a snapshot under snapshot:<projectKey>:<date>', async () => {
      useInMemoryKvs();
      const s = snapshot('KAN', '2026-08-10', 12);

      await saveSnapshot('KAN', s);

      expect(mockedSet).toHaveBeenCalledWith('snapshot:KAN:2026-08-10', s);
    });

    it('returns the last N days of snapshots, oldest first', async () => {
      const store = useInMemoryKvs();
      for (const [date, total] of [
        ['2026-08-01', 10],
        ['2026-08-02', 11],
        ['2026-08-03', 12],
        ['2026-08-04', 13],
      ] as const) {
        store[`snapshot:KAN:${date}`] = snapshot('KAN', date, total);
      }

      const result = await getSnapshots('KAN', 2);

      expect(result.map((s) => s.date)).toEqual(['2026-08-03', '2026-08-04']);
    });

    it('returns fewer than N entries when there is not enough history yet', async () => {
      const store = useInMemoryKvs();
      store['snapshot:KAN:2026-08-10'] = snapshot('KAN', '2026-08-10', 10);

      const result = await getSnapshots('KAN', 7);

      expect(result).toHaveLength(1);
    });

    it('only reads snapshots for the requested project', async () => {
      const store = useInMemoryKvs();
      store['snapshot:KAN:2026-08-10'] = snapshot('KAN', '2026-08-10', 10);
      store['snapshot:OPS:2026-08-10'] = snapshot('OPS', '2026-08-10', 99);

      const result = await getSnapshots('KAN', 30);

      expect(result).toEqual([snapshot('KAN', '2026-08-10', 10)]);
    });
  });

  describe('getBaseline', () => {
    it('resolves null when the project has no snapshots yet', async () => {
      useInMemoryKvs();

      await expect(getBaseline('KAN')).resolves.toBeNull();
    });

    it("resolves the first-ever snapshot's issue count, regardless of insertion order", async () => {
      const store = useInMemoryKvs();
      store['snapshot:KAN:2026-08-03'] = snapshot('KAN', '2026-08-03', 30);
      store['snapshot:KAN:2026-08-01'] = snapshot('KAN', '2026-08-01', 10);
      store['snapshot:KAN:2026-08-02'] = snapshot('KAN', '2026-08-02', 20);

      await expect(getBaseline('KAN')).resolves.toBe(10);
    });
  });

  describe('pruneExpiredSnapshots (Tarea 5.1.d — 90-day retention)', () => {
    it('deletes snapshots older than 90 days and keeps the rest', async () => {
      const store = useInMemoryKvs();
      store['snapshot:KAN:2026-05-01'] = snapshot('KAN', '2026-05-01', 5); // 106 days before "now"
      store['snapshot:KAN:2026-06-01'] = snapshot('KAN', '2026-06-01', 8); // 75 days before "now"
      const now = new Date('2026-08-15T00:00:00.000Z');

      await pruneExpiredSnapshots('KAN', now);

      expect(mockedDelete).toHaveBeenCalledWith('snapshot:KAN:2026-05-01');
      expect(mockedDelete).toHaveBeenCalledTimes(1);
      expect(store).toHaveProperty('snapshot:KAN:2026-06-01');
    });

    it('deletes nothing when every snapshot is within the retention window', async () => {
      const store = useInMemoryKvs();
      store['snapshot:KAN:2026-08-01'] = snapshot('KAN', '2026-08-01', 5);

      await pruneExpiredSnapshots('KAN', new Date('2026-08-15T00:00:00.000Z'));

      expect(mockedDelete).not.toHaveBeenCalled();
    });

    it('saveSnapshot prunes automatically after writing', async () => {
      const store = useInMemoryKvs();
      store['snapshot:KAN:2026-01-01'] = snapshot('KAN', '2026-01-01', 1); // far past 90 days

      await saveSnapshot('KAN', snapshot('KAN', '2026-08-15', 20));

      expect(mockedDelete).toHaveBeenCalledWith('snapshot:KAN:2026-01-01');
    });
  });
});
