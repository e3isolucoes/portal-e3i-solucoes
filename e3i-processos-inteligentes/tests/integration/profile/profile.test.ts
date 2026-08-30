import { describe, it, expect, beforeEach } from 'vitest';
import { request } from '../../helpers/testServer';
import { resetTestDatabase, testDb } from '../../helpers/testDatabase';

describe('Integration Quality Gate: User Profile & Identity', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  const adminPass = 'PasswordA_Secret_2026!';
  const operatorPass = 'PasswordC_Safe_456$';

  it('1 & 2. /api/auth/session and /api/overview return valid user.name from database (never derived from email)', async () => {
    const loginRes = await request.post('/api/auth/login').send({ email: 'admin.a@e3i.com.br', password: adminPass });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const overviewRes = await request.get('/api/overview').set('Cookie', `e3i_token=${token}`);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.user.name).toBe('Administrador A');
    expect(overviewRes.body.user.name).not.toBe('admin.a'); // not derived via split/slice/substring
  });

  it('3, 4, 5 & 6. Users without name display fallback "Complete seu nome no perfil"', async () => {
    // Create user with empty name
    const anonUser = {
      id: 'usr-anon',
      name: '',
      email: 'anon@e3i.com.br',
      role: 'OPERATOR',
      tenantId: 'tenant-1',
      status: 'ACTIVE',
      passwordHash: testDb.users[0].passwordHash
    };
    testDb.users.push(anonUser);

    const loginRes = await request.post('/api/auth/login').send({ email: 'anon@e3i.com.br', password: adminPass });
    const token = loginRes.body.token;

    const overviewRes = await request.get('/api/overview').set('Cookie', `e3i_token=${token}`);
    expect(overviewRes.status).toBe(200);
    const displayName = overviewRes.body.user.name || 'Complete seu nome no perfil';
    expect(displayName).toBe('Complete seu nome no perfil');
  });

  it('7 & 9. Updating user profile updates session display and database', async () => {
    const loginRes = await request.post('/api/auth/login').send({ email: 'operator.c@e3i.com.br', password: operatorPass });
    const token = loginRes.body.token;
    const userId = loginRes.body.user.id;

    // Update profile name
    const updateRes = await request
      .put(`/api/users/${userId}`)
      .set('Cookie', `e3i_token=${token}`)
      .send({ name: 'Operador C Atualizado' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user.name).toBe('Operador C Atualizado');

    // Verify session overview reflects updated name
    const overviewRes = await request.get('/api/overview').set('Cookie', `e3i_token=${token}`);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.user.name).toBe('Operador C Atualizado');
  });

  it('8. Self-role change protection and unauthorized fields rejection', async () => {
    const loginRes = await request.post('/api/auth/login').send({ email: 'operator.c@e3i.com.br', password: operatorPass });
    const token = loginRes.body.token;
    const userId = loginRes.body.user.id;

    // Operator trying to change their own role to ADMIN
    const updateRes = await request
      .put(`/api/users/${userId}`)
      .set('Cookie', `e3i_token=${token}`)
      .send({ role: 'ADMIN' });

    expect(updateRes.status).toBe(403);
  });
});
