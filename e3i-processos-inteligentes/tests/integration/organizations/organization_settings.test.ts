import { describe, it, expect, beforeEach } from 'vitest';
import { request } from '../../helpers/testServer';
import { resetTestDatabase } from '../../helpers/testDatabase';

describe('Integration: Organization Settings and Visual Identity (Fase 01A.5)', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  it('should allow admin to get and update organization settings', async () => {
    const loginRes = await request.post('/api/auth/login').send({
      email: 'admin.a@e3i.com.br',
      password: 'PasswordA_Secret_2026!'
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const getRes = await request.get('/api/organization/settings').set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.legalName).toBeDefined();

    const patchRes = await request.patch('/api/organization/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ tradingName: 'E³I Soluções Atualizada Ltda', segment: 'Inovação e IA' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.settings.tradingName).toBe('E³I Soluções Atualizada Ltda');
    expect(patchRes.body.settings.segment).toBe('Inovação e IA');
  });

  it('should allow admin to update theme branding and validate colors', async () => {
    const loginRes = await request.post('/api/auth/login').send({
      email: 'admin.a@e3i.com.br',
      password: 'PasswordA_Secret_2026!'
    });
    const token = loginRes.body.token;

    const themeRes = await request.patch('/api/organization/branding/theme')
      .set('Authorization', `Bearer ${token}`)
      .send({ primaryColor: '#10B981', productName: 'Portal E³I' });

    expect(themeRes.status).toBe(200);
    expect(themeRes.body.branding.primaryColor).toBe('#10B981');
    expect(themeRes.body.branding.productName).toBe('Portal E³I');

    const invalidThemeRes = await request.patch('/api/organization/branding/theme')
      .set('Authorization', `Bearer ${token}`)
      .send({ primaryColor: 'invalid-color' });

    expect(invalidThemeRes.status).toBe(400);
    expect(invalidThemeRes.body.error.code).toBe('INVALID_COLOR');
  });

  it('should validate logo uploads and reject malicious SVG / oversized files', async () => {
    const loginRes = await request.post('/api/auth/login').send({
      email: 'admin.a@e3i.com.br',
      password: 'PasswordA_Secret_2026!'
    });
    const token = loginRes.body.token;

    const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadRes = await request.post('/api/organization/branding/logo')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: validPng });

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.success).toBe(true);

    const maliciousSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg><script>alert(1)</script></svg>').toString('base64');
    const svgRes = await request.post('/api/organization/branding/logo')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: maliciousSvg });

    expect(svgRes.status).toBe(400);
    expect(svgRes.body.error.code).toBe('INVALID_FILE');
  });

  it('should restrict settings modifications for non-admin users (RBAC)', async () => {
    const loginRes = await request.post('/api/auth/login').send({
      email: 'operator.c@e3i.com.br',
      password: 'PasswordC_Safe_456$'
    });
    const token = loginRes.body.token;

    const patchRes = await request.patch('/api/organization/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ tradingName: 'Tentativa Hacker' });

    expect(patchRes.status).toBe(403);
    expect(patchRes.body.error.code).toBe('PERMISSION_DENIED');
  });
});
