import { describe, it, expect, beforeEach } from 'vitest';
import { request } from '../../helpers/testServer';
import { resetTestDatabase, testDb } from '../../helpers/testDatabase';

describe('Integration: Observability, Health & Cost Monitoring (Fase 01A.8)', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  it('should respond to liveness check without external dependencies', async () => {
    const res = await request.get('/api/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.timestamp).toBeDefined();
  });

  it('should respond to readiness check with system dependency statuses', async () => {
    const res = await request.get('/api/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.checks.database.status).toBe('UP');
    expect(res.body.checks.storage.status).toBe('UP');
  });

  it('should protect health details and allow access only to E3I_ADMIN', async () => {
    // Non-admin login (operator)
    const opLogin = await request.post('/api/auth/login').send({
      email: 'operator.c@e3i.com.br',
      password: 'PasswordC_Safe_456$'
    });
    const opToken = opLogin.body.token;

    const opRes = await request.get('/api/health/details')
      .set('Authorization', `Bearer ${opToken}`);
    expect(opRes.status).toBe(403);

    // E3I_ADMIN login (tenant-1 admin with E3I_ADMIN role or similar)
    // Let's create or use an E3I_ADMIN user in testDb
    testDb.users.push({
      id: 'usr-e3i-admin',
      tenantId: 'tenant-1',
      name: 'Super Admin E3I',
      email: 'superadmin@e3i.com.br',
      passwordHash: 'dummy',
      role: 'E3I_ADMIN',
      status: 'ACTIVE'
    } as any);
    testDb.sessions.push({
      id: 'ses-e3i',
      userId: 'usr-e3i-admin',
      token: 'token-super-admin',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      revokedAt: null
    } as any);

    const adminRes = await request.get('/api/health/details')
      .set('Authorization', `Bearer token-super-admin`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.status).toBe('UP');
    expect(adminRes.body.dependencies).toBeDefined();
  });

  it('should enforce multi-tenant isolation on observability metrics and costs', async () => {
    // Login as admin of tenant-1
    const login1 = await request.post('/api/auth/login').send({
      email: 'admin.a@e3i.com.br',
      password: 'PasswordA_Secret_2026!'
    });
    const token1 = login1.body.token;

    const metricsRes1 = await request.get('/api/observability/metrics')
      .set('Authorization', `Bearer ${token1}`);
    expect(metricsRes1.status).toBe(200);
    // Tenant-1 should only see tenant-1 metrics
    const nonTenant1Metrics = metricsRes1.body.metrics.filter((m: any) => m.organizationId !== 'tenant-1');
    expect(nonTenant1Metrics.length).toBe(0);

    const costRes1 = await request.get('/api/observability/costs')
      .set('Authorization', `Bearer ${token1}`);
    expect(costRes1.status).toBe(200);
    expect(costRes1.body.totalEstimatedCost).toBeGreaterThan(0);
  });

  it('should return operational dashboard data for authorized roles', async () => {
    const login1 = await request.post('/api/auth/login').send({
      email: 'admin.a@e3i.com.br',
      password: 'PasswordA_Secret_2026!'
    });
    const token1 = login1.body.token;

    const dashRes = await request.get('/api/observability/dashboard')
      .set('Authorization', `Bearer ${token1}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.status).toBe('UP');
    expect(dashRes.body.estimatedCost).toBeDefined();
    expect(dashRes.body.alerts).toBeDefined();
  });
});
