import { describe, it, expect, beforeEach } from 'vitest';
import { request } from '../../helpers/testServer';
import { resetTestDatabase, testDb } from '../../helpers/testDatabase';

describe('Integration Quality Gate: Organization Status (Inactivation & Reactivation)', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  const e3iAdminPass = 'E3IAdmin_Pass_2026!';
  const orgAdminPass = 'OrgAdmin_Pass_789#';
  const processManagerPass = 'ProcessManager_Pass_456$';
  const approverPass = 'Approver_Pass_123!';
  const viewerPass = 'Viewer_Pass_321$';
  const opCPass = 'PasswordC_Safe_456$';

  // Helper to login and get token & cookies
  const loginUser = async (email: string, password: string) => {
    const res = await request.post('/api/auth/login').send({ email, password });
    return res;
  };

  describe('Authorization Scenarios for Status Changes', () => {
    it('1 & 2. E3I_ADMIN can inactivate and reactivate an organization', async () => {
      const loginRes = await loginUser('e3i.admin@e3i.com.br', e3iAdminPass);
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token;

      // Inactivate tenant-2
      const patchInactive = await request
        .patch('/api/tenants/tenant-2/status')
        .set('Cookie', `e3i_token=${token}`)
        .send({ status: 'INACTIVE' });
      expect(patchInactive.status).toBe(200);
      expect(patchInactive.body.tenant.status).toBe('INACTIVE');

      // Reactivate tenant-2
      const patchActive = await request
        .patch('/api/tenants/tenant-2/status')
        .set('Cookie', `e3i_token=${token}`)
        .send({ status: 'ACTIVE' });
      expect(patchActive.status).toBe(200);
      expect(patchActive.body.tenant.status).toBe('ACTIVE');
    });

    it('3. ORGANIZATION_ADMIN receives 403', async () => {
      const loginRes = await loginUser('org.admin@e3i.com.br', orgAdminPass);
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token;

      const res = await request
        .patch('/api/tenants/tenant-2/status')
        .set('Cookie', `e3i_token=${token}`)
        .send({ status: 'INACTIVE' });
      expect(res.status).toBe(403);
    });

    it('4. PROCESS_MANAGER receives 403', async () => {
      const loginRes = await loginUser('process.manager@e3i.com.br', processManagerPass);
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token;

      const res = await request
        .patch('/api/tenants/tenant-2/status')
        .set('Cookie', `e3i_token=${token}`)
        .send({ status: 'INACTIVE' });
      expect(res.status).toBe(403);
    });

    it('5. APPROVER receives 403', async () => {
      const loginRes = await loginUser('approver@e3i.com.br', approverPass);
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token;

      const res = await request
        .patch('/api/tenants/tenant-2/status')
        .set('Cookie', `e3i_token=${token}`)
        .send({ status: 'INACTIVE' });
      expect(res.status).toBe(403);
    });

    it('6. VIEWER receives 403', async () => {
      const loginRes = await loginUser('viewer@e3i.com.br', viewerPass);
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token;

      const res = await request
        .patch('/api/tenants/tenant-2/status')
        .set('Cookie', `e3i_token=${token}`)
        .send({ status: 'INACTIVE' });
      expect(res.status).toBe(403);
    });
  });

  describe('Inactivation Workflow & Session Revocation', () => {
    it('should validate complete inactivation lifecycle', async () => {
      // 1. Organization starts as ACTIVE
      const tenant2 = testDb.tenants.find(t => t.id === 'tenant-2');
      expect(tenant2?.status).toBe('ACTIVE');

      // User in tenant-2 logs in first
      const userLogin = await loginUser('manager.b@e3i.com.br', 'PasswordB_Secure_789#');
      expect(userLogin.status).toBe(200);
      const userToken = userLogin.body.token;

      // Verify session works
      const overviewBefore = await request.get('/api/overview').set('Cookie', `e3i_token=${userToken}`);
      expect(overviewBefore.status).toBe(200);

      // 2. E3I_ADMIN inactivates tenant-2
      const adminLogin = await loginUser('e3i.admin@e3i.com.br', e3iAdminPass);
      const adminToken = adminLogin.body.token;

      const inactivateRes = await request
        .patch('/api/tenants/tenant-2/status')
        .set('Cookie', `e3i_token=${adminToken}`)
        .send({ status: 'INACTIVE' });

      expect(inactivateRes.status).toBe(200);
      // 3. Status persisted in db
      expect(testDb.tenants.find(t => t.id === 'tenant-2')?.status).toBe('INACTIVE');
      // 10. Event informs number of revoked sessions
      expect(inactivateRes.body.revokedSessionsCount).toBeGreaterThan(0);

      // 4 & 5. Active session receives revokedAt and returns 401 with cookie removal
      const overviewAfter = await request.get('/api/overview').set('Cookie', `e3i_token=${userToken}`);
      expect(overviewAfter.status).toBe(401);
      expect(overviewAfter.headers['set-cookie']).toBeDefined();

      // 6. New login is blocked
      const newLogin = await loginUser('manager.b@e3i.com.br', 'PasswordB_Secure_789#');
      expect(newLogin.status).toBe(401);

      // 8. Users of another organization (tenant-1) continue accessing
      const opCLogin = await loginUser('operator.c@e3i.com.br', opCPass);
      const opCToken = opCLogin.body.token;
      const otherOrgOverview = await request.get('/api/overview').set('Cookie', `e3i_token=${opCToken}`);
      expect(otherOrgOverview.status).toBe(200);

      // 9. Audit event records inactivation
      const auditRes = await request.get('/api/audit-logs');
      const inactivationLog = auditRes.body.find((l: any) => l.action === 'ORGANIZATION_INACTIVATED');
      expect(inactivationLog).toBeDefined();
    });
  });

  describe('Reactivation Workflow', () => {
    it('should validate reactivation lifecycle', async () => {
      const adminLogin = await loginUser('e3i.admin@e3i.com.br', e3iAdminPass);
      const adminToken = adminLogin.body.token;

      // Inactivate first
      await request
        .patch('/api/tenants/tenant-2/status')
        .set('Cookie', `e3i_token=${adminToken}`)
        .send({ status: 'INACTIVE' });

      // 1. E3I_ADMIN alters to ACTIVE
      const reactivateRes = await request
        .patch('/api/tenants/tenant-2/status')
        .set('Cookie', `e3i_token=${adminToken}`)
        .send({ status: 'ACTIVE' });

      expect(reactivateRes.status).toBe(200);
      expect(testDb.tenants.find(t => t.id === 'tenant-2')?.status).toBe('ACTIVE');

      // 2. New login works again
      const newLogin = await loginUser('manager.b@e3i.com.br', 'PasswordB_Secure_789#');
      expect(newLogin.status).toBe(200);

      // 5. Reactivation generates audit
      const auditRes = await request.get('/api/audit-logs');
      const reactivateLog = auditRes.body.find((l: any) => l.action === 'ORGANIZATION_REACTIVATED');
      expect(reactivateLog).toBeDefined();
    });
  });
});
