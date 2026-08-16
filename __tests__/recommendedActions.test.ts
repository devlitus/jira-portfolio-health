import { buildRecommendedActions } from '../src/frontend/lib/recommendedActions';
import { ProjectDetail } from '../src/health/projectDetail';
import { HealthFactor } from '../src/metrics/model';
import { Recommendation } from '../src/health/recommendations';

function factor(code: string, impact: number): HealthFactor {
  return { code, impact, message: `${code} message` };
}

function recommendation(code: string, message = `${code} action`): Recommendation {
  return { code, message };
}

function detail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    projectKey: 'PAY',
    projectName: 'Payments Platform',
    healthScore: 50,
    status: 'AT_RISK',
    trend: '—',
    dimensions: [],
    factors: [],
    recommendations: [],
    ...overrides,
  };
}

describe('buildRecommendedActions (Tarea D.1, Fase D)', () => {
  it('derives CRITICAL severity when the matching factor impact is -40 or worse', () => {
    const items = buildRecommendedActions([
      detail({
        recommendations: [recommendation('SCOPE_GROWTH')],
        factors: [factor('SCOPE_GROWTH', -40)],
      }),
    ]);

    expect(items[0].severity).toBe('CRITICAL');
  });

  it('derives AT_RISK severity when the matching factor impact is between -20 and -39', () => {
    const items = buildRecommendedActions([
      detail({
        recommendations: [recommendation('BLOCKED_ISSUES')],
        factors: [factor('BLOCKED_ISSUES', -25)],
      }),
    ]);

    expect(items[0].severity).toBe('AT_RISK');
  });

  it('derives HEALTHY severity when the matching factor impact is below 20 points', () => {
    const items = buildRecommendedActions([
      detail({
        recommendations: [recommendation('OVERDUE_ISSUES')],
        factors: [factor('OVERDUE_ISSUES', -10)],
      }),
    ]);

    expect(items[0].severity).toBe('HEALTHY');
  });

  it('falls back to HEALTHY (never a fabricated high severity) when no matching factor exists', () => {
    const items = buildRecommendedActions([
      detail({
        recommendations: [recommendation('CAPACITY_OVERLOAD')],
        factors: [],
      }),
    ]);

    expect(items[0].severity).toBe('HEALTHY');
  });

  it('maps all 4 rule codes to their readable ruleLabel', () => {
    const items = buildRecommendedActions([
      detail({
        recommendations: [
          recommendation('SCOPE_GROWTH'),
          recommendation('BLOCKED_ISSUES'),
          recommendation('OVERDUE_ISSUES'),
          recommendation('CAPACITY_OVERLOAD'),
        ],
      }),
    ]);

    expect(items.map((item) => item.ruleLabel)).toEqual([
      'SCOPE GROWTH > 20%',
      'BLOCKED ISSUES ≥ 3',
      'OVERDUE RATIO > 0.20',
      'WORKLOAD SIGNAL = HIGH',
    ]);
  });

  it('orders projects ascending by healthScore (worst first), null scores last, preserving each project\'s own recommendation order', () => {
    const items = buildRecommendedActions([
      detail({
        projectKey: 'HEALTHY',
        healthScore: 90,
        recommendations: [recommendation('OVERDUE_ISSUES')],
      }),
      detail({
        projectKey: 'NO_ANALYSIS',
        healthScore: null,
        recommendations: [recommendation('SCOPE_GROWTH')],
      }),
      detail({
        projectKey: 'WORST',
        healthScore: 20,
        recommendations: [recommendation('BLOCKED_ISSUES'), recommendation('CAPACITY_OVERLOAD')],
      }),
    ]);

    expect(items.map((item) => `${item.projectKey}:${item.code}`)).toEqual([
      'WORST:BLOCKED_ISSUES',
      'WORST:CAPACITY_OVERLOAD',
      'HEALTHY:OVERDUE_ISSUES',
      'NO_ANALYSIS:SCOPE_GROWTH',
    ]);
  });

  it('returns an empty array when no monitored project has recommendations', () => {
    const items = buildRecommendedActions([detail({ recommendations: [] }), detail({ projectKey: 'OTHER' })]);

    expect(items).toEqual([]);
  });
});
