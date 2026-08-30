import { describe, it, expect, beforeEach } from 'vitest';
import { request } from '../../helpers/testServer';
import { resetTestDatabase } from '../../helpers/testDatabase';

describe('E3I — Sprint 2.2: Strategy Canvas Adaptativo Quality Gate', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  const orgAdminPass = 'OrgAdmin_Pass_789#';

  const loginUser = async (email: string, password: string) => {
    return await request.post('/api/auth/login').send({ email, password });
  };

  it('1. Should fetch or generate Strategy Canvas from context package / discovery', async () => {
    const login = await loginUser('org.admin@e3i.com.br', orgAdminPass);
    expect(login.status).toBe(200);
    const token = login.body.token;

    const res = await request
      .get('/api/strategy-canvas')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.version).toBeDefined();
    expect(res.body.direction).toBeDefined();
    expect(res.body.objectives).toBeInstanceOf(Array);
    expect(res.body.priorities).toBeInstanceOf(Array);
    expect(res.body.indicators).toBeInstanceOf(Array);
    expect(res.body.valueChain).toBeInstanceOf(Array);
    expect(res.body.risks).toBeInstanceOf(Array);
  });

  it('2. Should confirm strategic objective and update status', async () => {
    const login = await loginUser('org.admin@e3i.com.br', orgAdminPass);
    const token = login.body.token;

    // Get initial canvas
    const getRes = await request
      .get('/api/strategy-canvas')
      .set('Authorization', `Bearer ${token}`);
    
    const objId = getRes.body.objectives[0].id;

    // Confirm objective
    const updateRes = await request
      .post('/api/strategy-canvas/objective')
      .set('Authorization', `Bearer ${token}`)
      .send({ objectiveId: objId, status: 'CONFIRMED' });

    expect(updateRes.status).toBe(200);
    const updatedObj = updateRes.body.objectives.find((o: any) => o.id === objId);
    expect(updatedObj.status).toBe('CONFIRMED');
  });

  it('3. Should complete Strategy Canvas and version Context Package', async () => {
    const login = await loginUser('org.admin@e3i.com.br', orgAdminPass);
    const token = login.body.token;

    // Ensure canvas is generated first
    await request.get('/api/strategy-canvas').set('Authorization', `Bearer ${token}`);

    const completeRes = await request
      .post('/api/strategy-canvas/complete')
      .set('Authorization', `Bearer ${token}`);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.success).toBe(true);
    expect(completeRes.body.canvas.version).toMatch(/^v2\./);
    expect(completeRes.body.contextPackage.version).toMatch(/^v2\./);
  });
});
