import { calculateHealthScore } from '../src/health/score';

describe('calculateHealthScore', () => {
  it('§30 Healthy project: high scores across all dimensions yield health >= 90', () => {
    const health = calculateHealthScore({
      schedule: 95,
      delivery: 90,
      scope: 95,
      capacity: 90,
      dependencies: 100,
    });

    expect(health).not.toBeNull();
    expect(health as number).toBeGreaterThanOrEqual(90);
    expect(health).toBe(94); // 95*.3 + 90*.25 + 95*.15 + 90*.15 + 100*.15 = 93.75
  });

  it('applies the weighted formula (Schedule 30 / Delivery 25 / Scope 15 / Capacity 15 / Dependencies 15)', () => {
    const health = calculateHealthScore({
      schedule: 100,
      delivery: 0,
      scope: 100,
      capacity: 0,
      dependencies: 100,
    });

    // 100*.3 + 0*.25 + 100*.15 + 0*.15 + 100*.15 = 60
    expect(health).toBe(60);
  });

  it('redistributes the weight of a null dimension proportionally across the rest', () => {
    const health = calculateHealthScore({
      schedule: 100,
      delivery: 50,
      scope: null,
      capacity: null,
      dependencies: null,
    });

    // available weight = .3 + .25 = .55
    // 100*(.3/.55) + 50*(.25/.55) = 77.27... -> 77
    expect(health).toBe(77);
  });

  it('does not change the score when equally-weighted dimensions share the same value, regardless of which are null', () => {
    const full = calculateHealthScore({
      schedule: 80,
      delivery: 80,
      scope: 80,
      capacity: 80,
      dependencies: 80,
    });
    const partial = calculateHealthScore({
      schedule: 80,
      delivery: 80,
      scope: null,
      capacity: null,
      dependencies: null,
    });

    expect(full).toBe(80);
    expect(partial).toBe(80);
  });

  it('returns null when every dimension is null (no false penalty for missing data)', () => {
    const health = calculateHealthScore({
      schedule: null,
      delivery: null,
      scope: null,
      capacity: null,
      dependencies: null,
    });

    expect(health).toBeNull();
  });

  it('scores a single available dimension at its full redistributed weight', () => {
    const health = calculateHealthScore({
      schedule: 42,
      delivery: null,
      scope: null,
      capacity: null,
      dependencies: null,
    });

    expect(health).toBe(42);
  });

  it('clamps and rounds the result to an integer within [0, 100]', () => {
    const perfect = calculateHealthScore({
      schedule: 100,
      delivery: 100,
      scope: 100,
      capacity: 100,
      dependencies: 100,
    });
    const zero = calculateHealthScore({
      schedule: 0,
      delivery: 0,
      scope: 0,
      capacity: 0,
      dependencies: 0,
    });

    expect(perfect).toBe(100);
    expect(Number.isInteger(perfect)).toBe(true);
    expect(zero).toBe(0);
  });
});
