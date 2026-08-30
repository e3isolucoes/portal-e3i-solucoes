import { describe, it, expect, beforeEach } from 'vitest';
import { request } from '../../helpers/testServer';
import { resetTestDatabase, testDb } from '../../helpers/testDatabase';

describe('Integration Quality Gate: Authentication Matrix & Sessions', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  const passA = 'PasswordA_Secret_2026!';
  const passB = 'PasswordB_Secure_789#';
  const passC = 'PasswordC_Safe_456$';

  const emailAdmin = 'admin.a@e3i.com.br';
  const emailManager = 'manager.b@e3i.com.br';
  const emailOperator = 'operator.c@e3i.com.br';

  // 13 API Authentication Matrix Test Cases
  it('1. Admin A + password A -> 200', async () => {
    const res = await request.post('/api/auth/login').send({ email: emailAdmin, password: passA });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(emailAdmin);
    // Verify DTO does not expose passwordHash
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('2. Admin A + password B -> 401', async () => {
    const res = await request.post('/api/auth/login').send({ email: emailAdmin, password: passB });
    expect(res.status).toBe(401);
  });

  it('3. Admin A + password C -> 401', async () => {
    const res = await request.post('/api/auth/login').send({ email: emailAdmin, password: passC });
    expect(res.status).toBe(401);
  });

  it('4. Manager B + password B -> 200', async () => {
    const res = await request.post('/api/auth/login').send({ email: emailManager, password: passB });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(emailManager);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('5. Manager B + password A -> 401', async () => {
    const res = await request.post('/api/auth/login').send({ email: emailManager, password: passA });
    expect(res.status).toBe(401);
  });

  it('6. Manager B + password C -> 401', async () => {
    const res = await request.post('/api/auth/login').send({ email: emailManager, password: passC });
    expect(res.status).toBe(401);
  });

  it('7. Operator C + password C -> 200', async () => {
    const res = await request.post('/api/auth/login').send({ email: emailOperator, password: passC });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(emailOperator);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('8. Operator C + password A -> 401', async () => {
    const res = await request.post('/api/auth/login').send({ email: emailOperator, password: passA });
    expect(res.status).toBe(401);
  });

  it('9. Operator C + password B -> 401', async () => {
    const res = await request.post('/api/auth/login').send({ email: emailOperator, password: passB });
    expect(res.status).toBe(401);
  });

  it('10. Non-existent user -> 401', async () => {
    const res = await request.post('/api/auth/login').send({ email: 'ghost@e3i.com.br', password: passA });
    expect(res.status).toBe(401);
  });

  it('11. Inactive user -> 401', async () => {
    const res = await request.post('/api/auth/login').send({ email: 'inactive@e3i.com.br', password: 'InactivePass123!' });
    expect(res.status).toBe(401);
  });

  it('12. Inactive organization -> 401', async () => {
    const res = await request.post('/api/auth/login').send({ email: 'orginativa@e3i.com.br', password: 'OrgPass123!' });
    expect(res.status).toBe(401);
  });

  it('13. Invited & unactivated user (PENDING) -> 401', async () => {
    const res = await request.post('/api/auth/login').send({ email: 'invited@e3i.com.br', password: 'InvitedPass123!' });
    expect(res.status).toBe(401);
  });

  // Session & Cookie Validation Tests
  it('should create persistent session, HttpOnly cookie, and support logout with revocation', async () => {
    // 1. Login
    const loginRes = await request.post('/api/auth/login').send({ email: emailAdmin, password: passA });
    expect(loginRes.status).toBe(200);
    const setCookieHeader = loginRes.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : setCookieHeader;
    expect(cookieStr).toContain('HttpOnly');

    const token = loginRes.body.token;
    expect(token).toBeDefined();

    // 2. Access protected endpoint with cookie
    const overviewRes = await request.get('/api/overview').set('Cookie', `e3i_token=${token}`);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.user.email).toBe(emailAdmin);

    // 3. Logout
    const logoutRes = await request.post('/api/auth/logout').set('Cookie', `e3i_token=${token}`);
    expect(logoutRes.status).toBe(200);

    // 4. Try accessing with revoked token -> should return 401
    const revokedAccessRes = await request.get('/api/overview').set('Cookie', `e3i_token=${token}`);
    expect(revokedAccessRes.status).toBe(401);
  });

  it('should reject expired sessions with 401', async () => {
    const loginRes = await request.post('/api/auth/login').send({ email: emailAdmin, password: passA });
    const token = loginRes.body.token;

    // Simulate session expiration in DB
    const session = testDb.sessions.find(s => s.token === token);
    if (session) {
      session.expiresAt = new Date(Date.now() - 10000).toISOString(); // expired 10 seconds ago
    }

    const res = await request.get('/api/overview').set('Cookie', `e3i_token=${token}`);
    expect(res.status).toBe(401);
  });
});
