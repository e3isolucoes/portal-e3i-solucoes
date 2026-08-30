import { describe, it, expect, beforeEach } from 'vitest';
import { request } from '../../helpers/testServer';
import { resetTestDatabase } from '../../helpers/testDatabase';

describe('Integration: Organizations / Tenants Endpoints', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  it('should retrieve list of organizations', async () => {
    const res = await request.get('/api/tenants');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0].name).toContain('E3I');
  });

  it('should return health status', async () => {
    const res = await request.get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
