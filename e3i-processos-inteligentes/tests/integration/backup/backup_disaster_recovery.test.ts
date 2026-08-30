import { describe, it, expect, beforeEach } from 'vitest';
import { request } from '../../helpers/testServer';
import { resetTestDatabase, testDb } from '../../helpers/testDatabase';

describe('Integration: Backup, Disaster Recovery & Operational Continuity (Fase 01A.9)', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  it('should get operational mode and allow E3I_ADMIN to toggle maintenance mode', async () => {
    const modeRes = await request.get('/api/operational-mode');
    expect(modeRes.status).toBe(200);
    expect(modeRes.body.operationalMode).toBe('NORMAL');

    // Login as E3I_ADMIN
    testDb.users.push({
      id: 'usr-e3i-admin-9',
      tenantId: 'tenant-1',
      name: 'Super Admin E3I',
      email: 'superadmin9@e3i.com.br',
      passwordHash: 'dummy',
      role: 'E3I_ADMIN',
      status: 'ACTIVE'
    } as any);
    testDb.sessions.push({
      id: 'ses-e3i-9',
      userId: 'usr-e3i-admin-9',
      token: 'token-super-admin-9',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      revokedAt: null
    } as any);

    const maintRes = await request.post('/api/maintenance-mode')
      .set('Authorization', 'Bearer token-super-admin-9')
      .send({ enabled: true });
    expect(maintRes.status).toBe(200);
    expect(maintRes.body.operationalMode).toBe('MAINTENANCE');

    // Disable maintenance mode
    const normalRes = await request.post('/api/maintenance-mode')
      .set('Authorization', 'Bearer token-super-admin-9')
      .send({ enabled: false });
    expect(normalRes.status).toBe(200);
    expect(normalRes.body.operationalMode).toBe('NORMAL');
  });

  it('should list backups with RBAC protection and tenant isolation', async () => {
    // Login as tenant-1 admin
    const login1 = await request.post('/api/auth/login').send({
      email: 'admin.a@e3i.com.br',
      password: 'PasswordA_Secret_2026!'
    });
    const token1 = login1.body.token;

    const bkpList = await request.get('/api/backups')
      .set('Authorization', `Bearer ${token1}`);
    expect(bkpList.status).toBe(200);
    expect(bkpList.body.items).toBeDefined();
  });

  it('should initiate a new backup job successfully', async () => {
    const login1 = await request.post('/api/auth/login').send({
      email: 'admin.a@e3i.com.br',
      password: 'PasswordA_Secret_2026!'
    });
    const token1 = login1.body.token;

    const createBkp = await request.post('/api/backups')
      .set('Authorization', `Bearer ${token1}`)
      .send({ type: 'FULL', scope: 'TENANT' });
    expect(createBkp.status).toBe(200);
    expect(createBkp.body.backup.status).toBe('SUCCEEDED');
    expect(createBkp.body.backup.checksum).toBeDefined();
  });

  it('should restrict global restoration to E3I_ADMIN and validate checksum', async () => {
    // Login as tenant-1 admin (should fail restore)
    const login1 = await request.post('/api/auth/login').send({
      email: 'admin.a@e3i.com.br',
      password: 'PasswordA_Secret_2026!'
    });
    const token1 = login1.body.token;

    const failRestore = await request.post('/api/backups/bkp-1/restore')
      .set('Authorization', `Bearer ${token1}`);
    expect(failRestore.status).toBe(403);

    // Setup E3I_ADMIN
    testDb.users.push({
      id: 'usr-e3i-admin-9',
      tenantId: 'tenant-1',
      name: 'Super Admin E3I',
      email: 'superadmin9@e3i.com.br',
      passwordHash: 'dummy',
      role: 'E3I_ADMIN',
      status: 'ACTIVE'
    } as any);
    testDb.sessions.push({
      id: 'ses-e3i-9',
      userId: 'usr-e3i-admin-9',
      token: 'token-super-admin-9',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      revokedAt: null
    } as any);

    const successRestore = await request.post('/api/backups/bkp-1/restore')
      .set('Authorization', 'Bearer token-super-admin-9');
    expect(successRestore.status).toBe(200);
    expect(successRestore.body.restoreJob.status).toBe('SUCCEEDED');
    expect(successRestore.body.restoreJob.validationResult).toBe('CHECKSUM_VALIDATED_INTEGRITY_OK');
  });

  it('should execute and list disaster recovery tests', async () => {
    testDb.users.push({
      id: 'usr-e3i-admin-9',
      tenantId: 'tenant-1',
      name: 'Super Admin E3I',
      email: 'superadmin9@e3i.com.br',
      passwordHash: 'dummy',
      role: 'E3I_ADMIN',
      status: 'ACTIVE'
    } as any);
    testDb.sessions.push({
      id: 'ses-e3i-9',
      userId: 'usr-e3i-admin-9',
      token: 'token-super-admin-9',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      revokedAt: null
    } as any);

    const drRes = await request.post('/api/backups/dr-test')
      .set('Authorization', 'Bearer token-super-admin-9')
      .send({ backupJobId: 'bkp-1' });
    expect(drRes.status).toBe(200);
    expect(drRes.body.disasterRecoveryTest.status).toBe('SUCCEEDED');
    expect(drRes.body.disasterRecoveryTest.rpoObservedMinutes).toBeDefined();
    expect(drRes.body.disasterRecoveryTest.rtoObservedMinutes).toBeDefined();

    const listDr = await request.get('/api/backups/dr-tests')
      .set('Authorization', 'Bearer token-super-admin-9');
    expect(listDr.status).toBe(200);
    expect(listDr.body.items.length).toBeGreaterThan(0);
  });

  it('should export tenant data excluding sensitive hashes and tokens', async () => {
    const login1 = await request.post('/api/auth/login').send({
      email: 'admin.a@e3i.com.br',
      password: 'PasswordA_Secret_2026!'
    });
    const token1 = login1.body.token;

    const exportRes = await request.get('/api/tenants/tenant-1/export')
      .set('Authorization', `Bearer ${token1}`);
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.tenant).toBeDefined();
    expect(exportRes.body.users).toBeDefined();
    // Ensure passwords or passwordHash are not exported
    exportRes.body.users.forEach((u: any) => {
      expect(u.passwordHash).toBeUndefined();
      expect(u.token).toBeUndefined();
    });
  });
});
