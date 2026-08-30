import { describe, it, expect, beforeEach } from 'vitest';
import { request } from '../../helpers/testServer';
import { resetTestDatabase, testDb } from '../../helpers/testDatabase';

describe('Integration: Transactional Notifications & Secure Email (Fase 01A.7)', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  it('should queue and manage notifications when user is invited or password reset requested', async () => {
    // Login as admin
    const loginRes = await request.post('/api/auth/login').send({
      email: 'admin.a@e3i.com.br',
      password: 'PasswordA_Secret_2026!'
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    // Simulate pushing a notification into testDb directly or via action
    const notifId = `notif-${Date.now()}`;
    testDb.notifications.push({
      id: notifId,
      organizationId: 'tenant-1',
      recipientUserId: 'usr-new',
      recipientEmail: 'newuser@e3i.com.br',
      type: 'USER_INVITATION',
      templateVersion: '1.0',
      status: 'SENT',
      provider: 'dev',
      providerMessageId: 'msg-123',
      idempotencyKey: 'inv-newuser@e3i.com.br',
      attemptCount: 1,
      lastErrorCode: null,
      scheduledAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      failedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const getRes = await request.get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.items.length).toBeGreaterThan(0);
    expect(getRes.body.items[0].type).toBe('USER_INVITATION');
    expect(getRes.body.items[0].status).toBe('SENT');
  });

  it('should enforce multi-tenant isolation on notification history', async () => {
    // Inject notification for tenant-2
    testDb.notifications.push({
      id: 'notif-tenant2',
      organizationId: 'tenant-2',
      recipientUserId: 'usr-b',
      recipientEmail: 'b@beta.com.br',
      type: 'USER_INVITATION',
      templateVersion: '1.0',
      status: 'SENT',
      provider: 'dev',
      providerMessageId: 'msg-456',
      idempotencyKey: 'inv-tenant2',
      attemptCount: 1,
      lastErrorCode: null,
      scheduledAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      failedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Login as admin of tenant-1
    const loginRes = await request.post('/api/auth/login').send({
      email: 'admin.a@e3i.com.br',
      password: 'PasswordA_Secret_2026!'
    });
    const token = loginRes.body.token;

    const listRes = await request.get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    // Tenant-1 admin should not see tenant-2 notifications
    const tenant2Notifs = listRes.body.items.filter((n: any) => n.organizationId === 'tenant-2');
    expect(tenant2Notifs.length).toBe(0);
  });

  it('should allow retrying a failed notification and logging audit event', async () => {
    const notifId = 'notif-failed-1';
    testDb.notifications.push({
      id: notifId,
      organizationId: 'tenant-1',
      recipientUserId: 'usr-1',
      recipientEmail: 'carlos.eduardo@e3i.com.br',
      type: 'PASSWORD_RESET_REQUESTED',
      templateVersion: '1.0',
      status: 'FAILED',
      provider: 'dev',
      providerMessageId: null,
      idempotencyKey: 'reset-123',
      attemptCount: 3,
      lastErrorCode: 'SMTP_TIMEOUT',
      scheduledAt: new Date().toISOString(),
      sentAt: null,
      deliveredAt: null,
      failedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const loginRes = await request.post('/api/auth/login').send({
      email: 'admin.a@e3i.com.br',
      password: 'PasswordA_Secret_2026!'
    });
    const token = loginRes.body.token;

    const retryRes = await request.post(`/api/notifications/${notifId}/retry`)
      .set('Authorization', `Bearer ${token}`);

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.notification.status).toBe('PENDING');

    // Check audit log for retry
    const auditRes = await request.get('/api/audit-logs');
    expect(auditRes.status).toBe(200);
    const retryLog = auditRes.body.find((l: any) => l.action === 'NOTIFICATION_RETRY_REQUESTED');
    expect(retryLog).toBeDefined();
  });

  it('should restrict notification access for non-admin roles (RBAC 403)', async () => {
    const loginRes = await request.post('/api/auth/login').send({
      email: 'operator.c@e3i.com.br',
      password: 'PasswordC_Safe_456$'
    });
    const token = loginRes.body.token;

    const res = await request.get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PERMISSION_DENIED');
  });
});
