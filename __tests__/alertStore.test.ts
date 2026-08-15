jest.mock('@forge/kvs', () => ({
  kvs: { get: jest.fn(), set: jest.fn() },
}));

import { kvs } from '@forge/kvs';
import { appendAlerts, getAlerts } from '../src/storage/alertStore';
import { Alert } from '../src/health/alerts';

const mockedGet = kvs.get as jest.Mock;
const mockedSet = kvs.set as jest.Mock;

function alert(code: Alert['code'], date: string): Alert {
  return { code, projectKey: 'KAN', date, message: `${code} on ${date}` };
}

describe('alertStore', () => {
  afterEach(() => {
    mockedGet.mockReset();
    mockedSet.mockReset();
  });

  describe('getAlerts', () => {
    it('returns an empty list when nothing has been stored yet', async () => {
      mockedGet.mockResolvedValue(undefined);

      await expect(getAlerts('KAN')).resolves.toEqual([]);
      expect(mockedGet).toHaveBeenCalledWith('alerts:KAN');
    });

    it('returns the stored alerts as-is', async () => {
      const stored = [alert('HEALTH_DROP', '2026-08-14')];
      mockedGet.mockResolvedValue(stored);

      await expect(getAlerts('KAN')).resolves.toEqual(stored);
    });
  });

  describe('appendAlerts', () => {
    it('does nothing when there are no new alerts', async () => {
      await appendAlerts('KAN', []);

      expect(mockedGet).not.toHaveBeenCalled();
      expect(mockedSet).not.toHaveBeenCalled();
    });

    it('appends to an empty history', async () => {
      mockedGet.mockResolvedValue(undefined);
      const newAlerts = [alert('HEALTH_DROP', '2026-08-15')];

      await appendAlerts('KAN', newAlerts);

      expect(mockedSet).toHaveBeenCalledWith('alerts:KAN', newAlerts);
    });

    it('appends to an existing history, preserving order', async () => {
      const existing = [alert('HEALTH_DROP', '2026-08-14')];
      mockedGet.mockResolvedValue(existing);
      const newAlerts = [alert('SCOPE_GROWTH_THRESHOLD', '2026-08-15')];

      await appendAlerts('KAN', newAlerts);

      expect(mockedSet).toHaveBeenCalledWith('alerts:KAN', [...existing, ...newAlerts]);
    });

    it('caps the stored history at the most recent 20 entries', async () => {
      const existing = Array.from({ length: 20 }, (_, i) => alert('HEALTH_DROP', `2026-07-${(i + 1).toString().padStart(2, '0')}`));
      mockedGet.mockResolvedValue(existing);
      const newAlert = alert('AT_RISK_TO_CRITICAL', '2026-08-15');

      await appendAlerts('KAN', [newAlert]);

      const savedList = mockedSet.mock.calls[0][1] as Alert[];
      expect(savedList).toHaveLength(20);
      expect(savedList[0]).toEqual(existing[1]);
      expect(savedList[savedList.length - 1]).toEqual(newAlert);
    });
  });
});
