import { getStatus } from '../src/health/status';

describe('getStatus', () => {
  it('boundary around the healthy threshold (default 80): 79 At Risk, 80 Healthy, 81 Healthy', () => {
    expect(getStatus(79)).toBe('AT_RISK');
    expect(getStatus(80)).toBe('HEALTHY');
    expect(getStatus(81)).toBe('HEALTHY');
  });

  it('boundary around the at-risk threshold (default 60): 59 Critical, 60 At Risk, 61 At Risk', () => {
    expect(getStatus(59)).toBe('CRITICAL');
    expect(getStatus(60)).toBe('AT_RISK');
    expect(getStatus(61)).toBe('AT_RISK');
  });

  it('extremes: 0 is Critical, 100 is Healthy', () => {
    expect(getStatus(0)).toBe('CRITICAL');
    expect(getStatus(100)).toBe('HEALTHY');
  });

  it('honors custom thresholds instead of the defaults', () => {
    const thresholds = { healthy: 90, atRisk: 70 };

    expect(getStatus(89, thresholds)).toBe('AT_RISK');
    expect(getStatus(90, thresholds)).toBe('HEALTHY');
    expect(getStatus(69, thresholds)).toBe('CRITICAL');
    expect(getStatus(70, thresholds)).toBe('AT_RISK');
  });
});
