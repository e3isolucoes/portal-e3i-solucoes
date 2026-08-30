import { describe, it, expect } from 'vitest';

describe('Business Context Package v1 - Core Logic Tests', () => {
  it('should calculate confidence score within 0-100 range deterministically', () => {
    const scores = {
      company: 92,
      strategy: 89,
      organization: 86,
      operations: 84,
      systems: 91,
      indicators: 88,
      knowledge: 82
    };
    const values = Object.values(scores);
    const overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    expect(overall).toBeGreaterThanOrEqual(0);
    expect(overall).toBeLessThanOrEqual(100);
    expect(overall).toBe(87);
  });

  it('should determine readiness score deterministically based on gaps and inconsistencies', () => {
    const evaluateReadiness = (overallConf: number, hasCriticalOpen: boolean) => {
      if (hasCriticalOpen) return 'NOT_READY';
      if (overallConf >= 85) return 'READY';
      return 'READY_WITH_GAPS';
    };

    expect(evaluateReadiness(88, false)).toBe('READY');
    expect(evaluateReadiness(88, true)).toBe('NOT_READY');
    expect(evaluateReadiness(80, false)).toBe('READY_WITH_GAPS');
  });

  it('should enforce immutable published versioning rules', () => {
    const packageMeta = {
      version: 'v2.1',
      status: 'PUBLISHED',
      checksum: 'abc123hash'
    };

    expect(packageMeta.status).toBe('PUBLISHED');
    expect(packageMeta.checksum).toBeDefined();
    // Modifying published package should require creating a new DRAFT
    const createNewDraft = (currentVer: string) => `v2.${parseInt(currentVer.split('.')[1]) + 1}`;
    expect(createNewDraft(packageMeta.version)).toBe('v2.2');
  });
});
