import { getBaseline } from '../src/storage/snapshotStore';

describe('snapshotStore.getBaseline (stub)', () => {
  it('resolves null until snapshot storage is implemented (Fase 5)', async () => {
    await expect(getBaseline('KAN')).resolves.toBeNull();
  });
});
