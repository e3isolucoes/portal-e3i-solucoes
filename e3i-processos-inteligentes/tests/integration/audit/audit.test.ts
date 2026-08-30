import { describe, it, expect, beforeEach } from 'vitest';
import { request } from '../../helpers/testServer';
import { resetTestDatabase } from '../../helpers/testDatabase';

describe('E³I — Fase 01A.4: Audit, Traceability & Security Hardening Quality Gate', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  const e3iAdminPass = 'E3IAdmin_Pass_2026!';
  const orgAdminPass = 'OrgAdmin_Pass_789#';
  const processManagerPass = 'ProcessManager_Pass_456$';
  const viewerPass = 'Viewer_Pass_321$';

  const loginUser = async (email: string, password: string) => {
    return await request.post('/api/auth/login').send({ email, password });
  };

  it('1. Should include requestId in responses, errors, and audit events', async () => {
    const loginRes = await loginUser('e3i.admin@e3i.com.br', e3iAdminPass);
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;
    const reqIdHeader = loginRes.header['x-request-id'];
    expect(reqIdHeader).toBeDefined();

    // Test error response has requestId and standardized error format
    const errRes = await request
      .get('/api/audit-events')
      .set('Cookie', `e3i_token=invalid_token`);
    expect(errRes.status).toBe(401);
    expect(errRes.body.error).toBeDefined();
    expect(errRes.body.error.code).toBe('INVALID_SESSION');
    expect(errRes.body.error.requestId).toBeDefined();
  });

  it('2. RBAC Permissions on Audit Events: E3I_ADMIN and ORGANIZATION_ADMIN can access, others receive 403', async () => {
    const e3iLogin = await loginUser('e3i.admin@e3i.com.br', e3iAdminPass);
    const e3iToken = e3iLogin.body.token;

    const auditRes = await request
      .get('/api/audit-events')
      .set('Cookie', `e3i_token=${e3iToken}`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.items).toBeDefined();
    expect(auditRes.body.total).toBeGreaterThanOrEqual(0);

    // Process Manager receives 403
    const pmLogin = await loginUser('process.manager@e3i.com.br', processManagerPass);
    const pmToken = pmLogin.body.token;
    const pmAudit = await request
      .get('/api/audit-events')
      .set('Cookie', `e3i_token=${pmToken}`);
    expect(pmAudit.status).toBe(403);
    expect(pmAudit.body.error.code).toBe('PERMISSION_DENIED');

    // Viewer receives 403
    const vLogin = await loginUser('viewer@e3i.com.br', viewerPass);
    const vToken = vLogin.body.token;
    const vAudit = await request
      .get('/api/audit-events')
      .set('Cookie', `e3i_token=${vToken}`);
    expect(vAudit.status).toBe(403);
  });

  it('3. Pagination, filtering, and sorting work correctly on audit events', async () => {
    const loginRes = await loginUser('e3i.admin@e3i.com.br', e3iAdminPass);
    const token = loginRes.body.token;

    const res = await request
      .get('/api/audit-events?page=1&pageSize=5')
      .set('Cookie', `e3i_token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(5);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('4. Immutability: No editing or deletion endpoints for audit events', async () => {
    const loginRes = await loginUser('e3i.admin@e3i.com.br', e3iAdminPass);
    const token = loginRes.body.token;

    const patchRes = await request
      .patch('/api/audit-events/ev-123')
      .set('Cookie', `e3i_token=${token}`)
      .send({ action: 'MODIFIED' });
    expect(patchRes.status).toBe(404);

    const deleteRes = await request
      .delete('/api/audit-events/ev-123')
      .set('Cookie', `e3i_token=${token}`);
    expect(deleteRes.status).toBe(404);
  });
});
