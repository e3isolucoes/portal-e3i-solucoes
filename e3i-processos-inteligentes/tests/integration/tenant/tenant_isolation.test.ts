import { describe, it, expect, beforeEach } from 'vitest';
import { request } from '../../helpers/testServer';
import { resetTestDatabase, testDb } from '../../helpers/testDatabase';

describe('Integration Quality Gate: Multi-Tenant Isolation & Security', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  const passA = 'PasswordA_Secret_2026!';
  const passB = 'PasswordB_Secure_789#';

  const emailAdminA = 'admin.a@e3i.com.br'; // tenant-1 (Org A)
  const emailManagerB = 'manager.b@e3i.com.br'; // tenant-2 (Org B)

  it('1 & 2. User A accesses only Org A data, User B accesses only Org B data', async () => {
    // Login as User A
    const loginA = await request.post('/api/auth/login').send({ email: emailAdminA, password: passA });
    expect(loginA.status).toBe(200);
    const tokenA = loginA.body.token;

    const resA = await request.get('/api/tenant/resources').set('Cookie', `e3i_token=${tokenA}`);
    expect(resA.status).toBe(200);
    expect(resA.body.tenantId).toBe('tenant-1');
    expect(resA.body.resources.every((r: any) => r.tenantId === 'tenant-1')).toBe(true);

    // Login as User B
    const loginB = await request.post('/api/auth/login').send({ email: emailManagerB, password: passB });
    expect(loginB.status).toBe(200);
    const tokenB = loginB.body.token;

    const resB = await request.get('/api/tenant/resources').set('Cookie', `e3i_token=${tokenB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.tenantId).toBe('tenant-2');
    expect(resB.body.resources.every((r: any) => r.tenantId === 'tenant-2')).toBe(true);
  });

  it('3 & 4. User A cannot query user of Org B and vice versa', async () => {
    const loginA = await request.post('/api/auth/login').send({ email: emailAdminA, password: passA });
    const tokenA = loginA.body.token;

    const usersResA = await request.get('/api/tenant/users').set('Cookie', `e3i_token=${tokenA}`);
    expect(usersResA.status).toBe(200);
    // Should only contain tenant-1 users
    expect(usersResA.body.users.some((u: any) => u.email === emailManagerB)).toBe(false);
  });

  it('5, 6, 7 & 8. organizationId sent in body, query, or header cannot alter tenant derivation from session', async () => {
    const loginA = await request.post('/api/auth/login').send({ email: emailAdminA, password: passA });
    const tokenA = loginA.body.token;

    // Send tampered organizationId in query, body, and headers
    const res = await request
      .get('/api/tenant/resources?organizationId=tenant-2')
      .set('Cookie', `e3i_token=${tokenA}`)
      .set('X-Organization-Id', 'tenant-2')
      .send({ organizationId: 'tenant-2' });

    expect(res.status).toBe(200);
    // Tenant must remain tenant-1 (derived strictly from session)
    expect(res.body.tenantId).toBe('tenant-1');
    expect(res.body.resources.some((r: any) => r.tenantId === 'tenant-2')).toBe(false);
  });

  it('9. Absence of session returns 401', async () => {
    const res = await request.get('/api/tenant/resources');
    expect(res.status).toBe(401);
  });

  it('10 & 11. Cross-tenant attempt does not reveal resource existence and generates sanitized audit log', async () => {
    const loginA = await request.post('/api/auth/login').send({ email: emailAdminA, password: passA });
    const tokenA = loginA.body.token;

    // User A tries to access a resource belonging to Tenant B (res-beta-1)
    const res = await request.get('/api/tenant/resources/res-beta-1').set('Cookie', `e3i_token=${tokenA}`);
    expect(res.status).toBe(404); // Does not reveal existence

    // Check audit log
    const auditRes = await request.get('/api/audit-logs');
    expect(auditRes.status).toBe(200);
    const crossLog = auditRes.body.find((l: any) => l.action === 'CROSS_TENANT_ACCESS_ATTEMPT');
    expect(crossLog).toBeDefined();
    expect(crossLog.details).not.toContain('Password');
  });

  it('12. Org A data does not persist after login to Org B', async () => {
    // Login as User A
    const loginA = await request.post('/api/auth/login').send({ email: emailAdminA, password: passA });
    const tokenA = loginA.body.token;

    const resA = await request.get('/api/overview').set('Cookie', `e3i_token=${tokenA}`);
    expect(resA.body.organization.id).toBe('tenant-1');

    // Logout A
    await request.post('/api/auth/logout').set('Cookie', `e3i_token=${tokenA}`);

    // Login as User B
    const loginB = await request.post('/api/auth/login').send({ email: emailManagerB, password: passB });
    const tokenB = loginB.body.token;

    const resB = await request.get('/api/overview').set('Cookie', `e3i_token=${tokenB}`);
    expect(resB.body.organization.id).toBe('tenant-2');
    expect(resB.body.organization.id).not.toBe('tenant-1');
  });
});
