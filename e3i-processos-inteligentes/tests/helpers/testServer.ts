import express from 'express';
import supertest from 'supertest';
import { testDb } from './testDatabase';
import { verifyPassword } from './auth';
import { AIConfig } from '../../src/ai/config/AIConfig';
import { AIHarness } from '../../src/ai/core/AIHarness';
import { globalPromptRegistry } from '../../src/ai/prompts/defaultRegistry';

export function createTestApp() {
  const app = express();
  app.use(express.json());

  // Request ID Middleware
  app.use((req: any, res: any, next: any) => {
    const requestId = (req.headers['x-request-id'] as string) || `req-${Math.random().toString(36).substring(2, 9)}`;
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  function sendError(req: any, res: any, status: number, code: string, message: string) {
    res.status(status).json({
      error: {
        code,
        message,
        requestId: req.requestId || 'req-unknown'
      }
    });
  }

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'E3I Test Server' });
  });

  // Tenants endpoint (public or protected)
  app.get('/api/tenants', (req, res) => {
    res.json(testDb.tenants);
  });

  // Session validation helper enforcing strict tenant derivation from session exclusively
  const validateTestSession = (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }

    if (!token) {
      res.setHeader('Set-Cookie', 'e3i_token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      res.status(401).json({ error: 'Sessão não autenticada.' });
      return null;
    }

    const session = testDb.sessions.find(s => s.token === token);
    if (!session) {
      res.setHeader('Set-Cookie', 'e3i_token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      res.status(401).json({ error: 'Sessão inválida.' });
      return null;
    }

    if (session.revokedAt) {
      res.setHeader('Set-Cookie', 'e3i_token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      res.status(401).json({ error: 'Sessão revogada.' });
      return null;
    }

    if (new Date(session.expiresAt) < new Date()) {
      res.setHeader('Set-Cookie', 'e3i_token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      res.status(401).json({ error: 'Sessão expirada.' });
      return null;
    }

    const user = testDb.users.find(u => u.id === session.userId);
    if (!user || user.status !== 'ACTIVE') {
      res.setHeader('Set-Cookie', 'e3i_token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      res.status(401).json({ error: 'Usuário inativo ou sem permissão.' });
      return null;
    }

    const tenant = testDb.tenants.find(t => t.id === user.tenantId);
    if (!tenant || tenant.status !== 'ACTIVE') {
      res.setHeader('Set-Cookie', 'e3i_token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      res.status(401).json({ error: 'Organização inativa.' });
      return null;
    }

    // Attempted tampering detection via body, query, or free headers
    const tamperedOrgId = req.body?.organizationId || req.query?.organizationId || req.headers['x-organization-id'] || req.headers['x-tenant-id'];
    if (tamperedOrgId && tamperedOrgId !== tenant.id) {
      testDb.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'CROSS_TENANT_ACCESS_ATTEMPT',
        details: `User ${user.email} (tenant ${tenant.id}) attempted tampering with organizationId: ${tamperedOrgId}`
      });
    }

    return { session, user, tenant };
  };

  // Overview / Session check endpoint
  app.get('/api/overview', (req, res) => {
    const authResult = validateTestSession(req, res);
    if (!authResult) return;
    const { user, tenant } = authResult;
    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId },
      organization: { id: tenant.id, name: tenant.name, status: tenant.status }
    });
  });

  // Tenant-scoped users endpoint (User A cannot see User B)
  app.get('/api/tenant/users', (req, res) => {
    const authResult = validateTestSession(req, res);
    if (!authResult) return;
    const { user, tenant } = authResult;

    // Filter users strictly belonging to user.tenantId
    const scopedUsers = testDb.users
      .filter(u => u.tenantId === tenant.id)
      .map(({ passwordHash, ...safe }) => safe);

    res.json({
      tenantId: tenant.id,
      users: scopedUsers
    });
  });

  // User profile / update endpoint
  app.put('/api/users/:id', (req, res) => {
    const authResult = validateTestSession(req, res);
    if (!authResult) return;
    const { user } = authResult;
    const targetUserId = req.params.id;

    const targetUser = testDb.users.find(u => u.id === targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Check if user is editing themselves or has ADMIN / E3I_ADMIN role
    const isSelf = user.id === targetUserId;
    const isAdmin = ['ADMIN', 'E3I_ADMIN', 'ORGANIZATION_ADMIN'].includes(user.role);

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { name, email, role, status } = req.body;

    // Self-role change protection
    if (isSelf && role && role !== targetUser.role) {
      testDb.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'UNAUTHORIZED_ROLE_CHANGE_ATTEMPT',
        details: `User ${user.email} attempted to alter their own role from ${targetUser.role} to ${role}`
      });
      return res.status(403).json({ error: 'Você não pode alterar seu próprio papel.' });
    }

    if (name !== undefined) targetUser.name = name;
    if (email !== undefined) targetUser.email = email;
    if (role !== undefined && isAdmin) targetUser.role = role;
    if (status !== undefined && isAdmin) targetUser.status = status;

    const { passwordHash, ...safeUser } = targetUser;
    res.json({ success: true, user: safeUser });
  });

  // Tenant status update endpoint (Inactivation / Reactivation)
  app.patch('/api/tenants/:id/status', (req, res) => {
    const authResult = validateTestSession(req, res);
    if (!authResult) return;
    const { user } = authResult;

    // Authorization: Only E3I_ADMIN can change organization status
    if (user.role !== 'E3I_ADMIN') {
      testDb.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'UNAUTHORIZED_TENANT_STATUS_CHANGE',
        details: `User ${user.email} with role ${user.role} attempted to change tenant status without E3I_ADMIN permission.`
      });
      return res.status(403).json({ error: 'Acesso negado. Apenas E3I_ADMIN pode alterar o status de organizações.' });
    }

    const tenantId = req.params.id;
    const { status } = req.body; // 'ACTIVE' | 'INACTIVE'

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use ACTIVE ou INACTIVE.' });
    }

    const targetTenant = testDb.tenants.find(t => t.id === tenantId);
    if (!targetTenant) {
      return res.status(404).json({ error: 'Organização não encontrada.' });
    }

    targetTenant.status = status;

    let revokedCount = 0;
    if (status === 'INACTIVE') {
      const tenantUserIds = testDb.users.filter(u => u.tenantId === tenantId).map(u => u.id);
      for (const session of testDb.sessions) {
        if (tenantUserIds.includes(session.userId) && session.revokedAt === null) {
          session.revokedAt = new Date().toISOString();
          revokedCount++;
        }
      }

      testDb.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'ORGANIZATION_INACTIVATED',
        details: `Organização ${targetTenant.name} (${tenantId}) inativada por ${user.email}. Sessões revogadas: ${revokedCount}`
      });
    } else {
      testDb.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'ORGANIZATION_REACTIVATED',
        details: `Organização ${targetTenant.name} (${tenantId}) reativada por ${user.email}.`
      });
    }

    res.setHeader('Set-Cookie', 'e3i_token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.json({
      success: true,
      tenant: targetTenant,
      revokedSessionsCount: revokedCount
    });
  });

  // Tenant-scoped resources endpoint
  app.get('/api/tenant/resources', (req, res) => {
    const authResult = validateTestSession(req, res);
    if (!authResult) return;
    const { tenant } = authResult;

    // Return dummy resources scoped to tenant
    const resources = [
      { id: 'res-alpha-1', tenantId: 'tenant-1', name: 'Documento Estratégico Alpha A' },
      { id: 'res-beta-1', tenantId: 'tenant-2', name: 'Relatório Financeiro Beta B' },
    ].filter(r => r.tenantId === tenant.id);

    res.json({
      tenantId: tenant.id,
      resources
    });
  });

  // Specific resource endpoint with strict cross-tenant defense
  app.get('/api/tenant/resources/:id', (req, res) => {
    const authResult = validateTestSession(req, res);
    if (!authResult) return;
    const { user, tenant } = authResult;
    const resourceId = req.params.id;

    const allResources = [
      { id: 'res-alpha-1', tenantId: 'tenant-1', title: 'Alpha Secret Project' },
      { id: 'res-beta-1', tenantId: 'tenant-2', title: 'Beta Secret Project' },
    ];

    const resource = allResources.find(r => r.id === resourceId);

    if (!resource || resource.tenantId !== tenant.id) {
      testDb.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'CROSS_TENANT_ACCESS_ATTEMPT',
        details: `User ${user.email} in tenant ${tenant.id} attempted to access resource ${resourceId} belonging to another tenant.`
      });
      return res.status(404).json({ error: 'Recurso não encontrado.' });
    }

    res.json({ success: true, resource });
  });

  // Login endpoint
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = testDb.users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      testDb.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'LOGIN_FAILED',
        details: `User not found: ${email}`
      });
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (user.status !== 'ACTIVE') {
      testDb.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'INACTIVE_USER_BLOCKED',
        details: `Inactive or pending user: ${user.email}`
      });
      return res.status(401).json({ error: 'Usuário inativo ou não ativado.' });
    }

    const tenant = testDb.tenants.find(t => t.id === user.tenantId);
    if (!tenant || tenant.status !== 'ACTIVE') {
      testDb.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'INACTIVE_TENANT_BLOCKED',
        details: `Inactive tenant for user: ${user.email}`
      });
      return res.status(401).json({ error: 'Organização inativa.' });
    }

    const isValid = verifyPassword(user.passwordHash, password);
    if (!isValid) {
      testDb.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'LOGIN_FAILED',
        details: `Incorrect password for user: ${user.email}`
      });
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = `e3i_jwt_token_${user.id}_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 86400000).toISOString();

    testDb.sessions.push({
      id: `sess-${Date.now()}`,
      userId: user.id,
      token,
      revokedAt: null,
      expiresAt,
    });

    res.setHeader('Set-Cookie', `e3i_token=${token}; HttpOnly; Path=/; SameSite=Lax`);

    const { passwordHash, ...safeUser } = user;

    res.json({
      success: true,
      token,
      user: safeUser,
      tenant,
    });
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }

    if (token) {
      const session = testDb.sessions.find(s => s.token === token);
      if (session) {
        session.revokedAt = new Date().toISOString();
      }
    }

    res.setHeader('Set-Cookie', 'e3i_token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.json({ success: true });
  });

  // Audit Events API (Phase 01A.4)
  app.get("/api/audit-events", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }

    if (!token) {
      return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    }
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) {
      return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    }
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user || user.status !== 'ACTIVE') {
      return sendError(req, res, 401, "INVALID_SESSION", "Usuário inativo.");
    }

    const allowedRoles = ['ADMIN', 'ORGANIZATION_ADMIN', 'MANAGER', 'E3I_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Você não possui permissão para realizar esta ação.");
    }

    let filtered = testDb.auditLogs || [];
    if (user.role !== 'E3I_ADMIN' && !(user.role === 'ADMIN' && user.tenantId === 'tenant-1')) {
      filtered = filtered.filter((ev: any) => ev.organizationId === user.tenantId || !ev.organizationId);
    }

    const { action, result, actorUserId, targetType, targetId, dateFrom, dateTo, page = '1', pageSize = '20' } = req.query;

    if (action) filtered = filtered.filter((e: any) => e.action === action);
    if (result) filtered = filtered.filter((e: any) => e.result === result);
    if (actorUserId) filtered = filtered.filter((e: any) => e.actorUserId === actorUserId);
    if (targetType) filtered = filtered.filter((e: any) => e.targetType === targetType);
    if (targetId) filtered = filtered.filter((e: any) => e.targetId === targetId);
    if (dateFrom) filtered = filtered.filter((e: any) => new Date(e.createdAt || e.timestamp) >= new Date(dateFrom as string));
    if (dateTo) filtered = filtered.filter((e: any) => new Date(e.createdAt || e.timestamp) <= new Date(dateTo as string));

    filtered.sort((a: any, b: any) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime());

    const pageNum = parseInt(page as string, 10) || 1;
    const sizeNum = Math.min(parseInt(pageSize as string, 10) || 20, 100);
    const total = filtered.length;
    const items = filtered.slice((pageNum - 1) * sizeNum, pageNum * sizeNum);

    res.json({
      items,
      total,
      page: pageNum,
      pageSize: sizeNum
    });
  });

  app.get("/api/audit-events/:eventId", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);

    const allowedRoles = ['ADMIN', 'ORGANIZATION_ADMIN', 'MANAGER', 'E3I_ADMIN'];
    if (!allowedRoles.includes(user?.role || '')) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Você não possui permissão.");
    }

    const { eventId } = req.params;
    const event = (testDb.auditLogs || []).find((e: any) => e.id === eventId);
    if (!event) {
      return sendError(req, res, 404, "NOT_FOUND", "Evento não encontrado.");
    }

    if (user?.role !== 'E3I_ADMIN' && event.organizationId && event.organizationId !== user?.tenantId) {
      return sendError(req, res, 404, "NOT_FOUND", "Evento não encontrado.");
    }

    res.json(event);
  });

  app.get("/api/admin/audit-events", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);

    if (user?.role !== 'ADMIN' && user?.role !== 'E3I_ADMIN') {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso restrito a administradores.");
    }

    const { page = '1', pageSize = '50' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const sizeNum = Math.min(parseInt(pageSize as string, 10) || 50, 100);
    const total = (testDb.auditLogs || []).length;
    const items = (testDb.auditLogs || []).slice((pageNum - 1) * sizeNum, pageNum * sizeNum);

    res.json({
      items,
      total,
      page: pageNum,
      pageSize: sizeNum
    });
  });

  app.patch("/api/audit-events/:eventId", (req: any, res: any) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Não permitido", requestId: req.requestId } });
  });

  app.delete("/api/audit-events/:eventId", (req: any, res: any) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Não permitido", requestId: req.requestId } });
  });

  // --- Notification Service & Email Engine (Fase 01A.7) in Test Server ---
  app.get("/api/notifications", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const allowedRoles = ['ADMIN', 'ORGANIZATION_ADMIN', 'E3I_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso restrito a administradores.");
    }

    let filtered = testDb.notifications || [];
    if (user.role !== 'E3I_ADMIN') {
      filtered = filtered.filter((n: any) => n.organizationId === user.tenantId);
    }

    const { status, type, page = '1', pageSize = '50' } = req.query;
    if (status) filtered = filtered.filter((n: any) => n.status === status);
    if (type) filtered = filtered.filter((n: any) => n.type === type);

    filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const pageNum = parseInt(page as string, 10) || 1;
    const sizeNum = Math.min(parseInt(pageSize as string, 10) || 50, 100);
    const total = filtered.length;
    const items = filtered.slice((pageNum - 1) * sizeNum, pageNum * sizeNum);

    res.json({ items, total, page: pageNum, pageSize: sizeNum });
  });

  app.get("/api/notifications/:notificationId", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const allowedRoles = ['ADMIN', 'ORGANIZATION_ADMIN', 'E3I_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso restrito a administradores.");
    }

    const { notificationId } = req.params;
    const notif = (testDb.notifications || []).find((n: any) => n.id === notificationId);
    if (!notif) {
      return sendError(req, res, 404, "NOT_FOUND", "Notificação não encontrada.");
    }

    if (user.role !== 'E3I_ADMIN' && notif.organizationId !== user.tenantId) {
      return sendError(req, res, 404, "NOT_FOUND", "Notificação não encontrada.");
    }

    res.json(notif);
  });

  app.post("/api/notifications/:notificationId/retry", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const allowedRoles = ['ADMIN', 'ORGANIZATION_ADMIN', 'E3I_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso restrito a administradores.");
    }

    const { notificationId } = req.params;
    const notif = (testDb.notifications || []).find((n: any) => n.id === notificationId);
    if (!notif) {
      return sendError(req, res, 404, "NOT_FOUND", "Notificação não encontrada.");
    }

    if (user.role !== 'E3I_ADMIN' && notif.organizationId !== user.tenantId) {
      return sendError(req, res, 404, "NOT_FOUND", "Notificação não encontrada.");
    }

    notif.status = 'PENDING';
    notif.attemptCount = (notif.attemptCount || 0) + 1;
    notif.lastErrorCode = null;
    notif.updatedAt = new Date().toISOString();

    testDb.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      organizationId: notif.organizationId,
      actorUserId: user.id,
      targetType: 'NOTIFICATION',
      targetId: notif.id,
      action: 'NOTIFICATION_RETRY_REQUESTED',
      result: 'SUCCESS',
      metadata: { type: notif.type }
    });

    res.json({ success: true, notification: notif });
  });

  // Audit logs endpoint (sanitized)
  app.get('/api/audit-logs', (req, res) => {
    const sanitizedLogs = testDb.auditLogs.map(log => ({
      ...log,
      details: (log.details || '').replace(/password[a-zA-Z0-9_!#$]+/gi, '[REDACTED]')
    }));
    res.json(sanitizedLogs);
  });

  // --- ORGANIZATION SETTINGS & BRANDING ENDPOINTS ---
  app.get(["/api/organization/settings", "/api/admin/organizations/:organizationId/settings"], (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const targetId = req.params.organizationId || req.query.organizationId || user.tenantId;
    const tenant = testDb.tenants.find(t => t.id === targetId);
    if (!tenant) return sendError(req, res, 404, "NOT_FOUND", "Organização não encontrada.");

    if (!(tenant as any).settings) {
      (tenant as any).settings = {
        legalName: tenant.name,
        tradingName: tenant.name,
        document: tenant.document,
        segment: "Tecnologia e Processos",
        size: "Médio",
        employeeCount: tenant.usersCount || 50,
        phone: "+55 11 3000-0000",
        email: `contato@${tenant.id}.com.br`,
        website: `https://www.${tenant.id}.com.br`,
        address: "Av. Paulista, 1000",
        city: "São Paulo",
        state: "SP",
        country: "Brasil",
        timezone: "America/Sao_Paulo",
        language: "pt-BR",
        currency: "BRL",
        status: tenant.status
      };
    }

    res.json({ ...(tenant as any).settings, status: tenant.status });
  });

  app.patch(["/api/organization/settings", "/api/admin/organizations/:organizationId/settings"], (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const targetId = req.params.organizationId || req.query.organizationId || user.tenantId;
    const tenant = testDb.tenants.find(t => t.id === targetId);
    if (!tenant) return sendError(req, res, 404, "NOT_FOUND", "Organização não encontrada.");

    const isAdmin = user.role === 'E3I_ADMIN' || user.role === 'ADMIN' || user.role === 'ORGANIZATION_ADMIN';
    if (!isAdmin) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso negado. Apenas E3I_ADMIN ou ORGANIZATION_ADMIN podem realizar esta alteração.");
    }

    if (!(tenant as any).settings) {
      (tenant as any).settings = {
        legalName: tenant.name,
        tradingName: tenant.name,
        document: tenant.document,
        segment: "Tecnologia e Processos",
        size: "Médio",
        employeeCount: tenant.usersCount || 50,
        phone: "+55 11 3000-0000",
        email: `contato@${tenant.id}.com.br`,
        website: `https://www.${tenant.id}.com.br`,
        address: "Av. Paulista, 1000",
        city: "São Paulo",
        state: "SP",
        country: "Brasil",
        timezone: "America/Sao_Paulo",
        language: "pt-BR",
        currency: "BRL",
        status: tenant.status
      };
    }

    const { legalName, tradingName, document, segment, size, employeeCount, phone, email, website, address, city, state, country, timezone, language, currency } = req.body;
    const s = (tenant as any).settings;
    if (legalName !== undefined) s.legalName = legalName;
    if (tradingName !== undefined) {
      s.tradingName = tradingName;
      tenant.name = tradingName;
    }
    if (document !== undefined) {
      s.document = document;
      tenant.document = document;
    }
    if (segment !== undefined) s.segment = segment;
    if (size !== undefined) s.size = size;
    if (employeeCount !== undefined) s.employeeCount = employeeCount;
    if (phone !== undefined) s.phone = phone;
    if (email !== undefined) s.email = email;
    if (website !== undefined) s.website = website;
    if (address !== undefined) s.address = address;
    if (city !== undefined) s.city = city;
    if (state !== undefined) s.state = state;
    if (country !== undefined) s.country = country;
    if (timezone !== undefined) s.timezone = timezone;
    if (language !== undefined) s.language = language;
    if (currency !== undefined) s.currency = currency;

    testDb.auditLogs.unshift({
      id: `ev-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      userId: user.id,
      userName: user.name,
      action: "ORGANIZATION_SETTINGS_UPDATED",
      module: "Organização",
      ipAddress: "127.0.0.1",
      status: "SUCCESS",
      details: `Configurações da organização ${tenant.id} atualizadas.`
    });

    res.json({ success: true, settings: s });
  });

  app.get(["/api/organization/branding", "/api/admin/organizations/:organizationId/branding"], (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const targetId = req.params.organizationId || req.query.organizationId || user.tenantId;
    const tenant = testDb.tenants.find(t => t.id === targetId);
    if (!tenant) return sendError(req, res, 404, "NOT_FOUND", "Organização não encontrada.");

    if (!(tenant as any).branding) {
      (tenant as any).branding = {
        logoUrl: tenant.customLogoUrl || '',
        faviconUrl: '',
        primaryColor: '#3B82F6',
        secondaryColor: '#D4AF37',
        accentColor: '#3B82F6',
        backgroundColor: '#0A192F',
        lightMode: false,
        darkMode: true,
        productName: 'E³I Processos Inteligentes'
      };
    }

    res.json((tenant as any).branding);
  });

  app.patch(["/api/organization/branding/theme", "/api/admin/organizations/:organizationId/branding/theme"], (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const targetId = req.params.organizationId || req.query.organizationId || user.tenantId;
    const tenant = testDb.tenants.find(t => t.id === targetId);
    if (!tenant) return sendError(req, res, 404, "NOT_FOUND", "Organização não encontrada.");

    const isAdmin = user.role === 'E3I_ADMIN' || user.role === 'ADMIN' || user.role === 'ORGANIZATION_ADMIN';
    if (!isAdmin) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso negado.");
    }

    const { primaryColor, secondaryColor, accentColor, backgroundColor, lightMode, darkMode, productName } = req.body;
    if (primaryColor && !/^#([A-Fa-f0-9]{3}){1,2}$/.test(primaryColor)) {
      return sendError(req, res, 400, "INVALID_COLOR", "Cor primária inválida.");
    }

    if (!(tenant as any).branding) {
      (tenant as any).branding = {
        logoUrl: tenant.customLogoUrl || '',
        faviconUrl: '',
        primaryColor: '#3B82F6',
        secondaryColor: '#D4AF37',
        accentColor: '#3B82F6',
        backgroundColor: '#0A192F',
        lightMode: false,
        darkMode: true,
        productName: 'E³I Processos Inteligentes'
      };
    }

    const b = (tenant as any).branding;
    if (primaryColor !== undefined) b.primaryColor = primaryColor;
    if (secondaryColor !== undefined) b.secondaryColor = secondaryColor;
    if (accentColor !== undefined) b.accentColor = accentColor;
    if (backgroundColor !== undefined) b.backgroundColor = backgroundColor;
    if (lightMode !== undefined) b.lightMode = lightMode;
    if (darkMode !== undefined) b.darkMode = darkMode;
    if (productName !== undefined) b.productName = productName;

    res.json({ success: true, branding: b });
  });

  app.post(["/api/organization/branding/logo", "/api/admin/organizations/:organizationId/branding/logo"], (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const targetId = req.params.organizationId || req.query.organizationId || user.tenantId;
    const tenant = testDb.tenants.find(t => t.id === targetId);
    if (!tenant) return sendError(req, res, 404, "NOT_FOUND", "Organização não encontrada.");

    const isAdmin = user.role === 'E3I_ADMIN' || user.role === 'ADMIN' || user.role === 'ORGANIZATION_ADMIN';
    if (!isAdmin) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso negado.");
    }

    const { data } = req.body;
    if (!data || typeof data !== 'string') {
      return sendError(req, res, 400, "INVALID_FILE", "Formato de arquivo inválido.");
    }
    const match = data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-\.+]+);base64,(.+)$/);
    if (!match) {
      return sendError(req, res, 400, "INVALID_FILE", "Formato de dados do arquivo inválido.");
    }
    const mime = match[1].toLowerCase();
    if (mime === 'image/svg+xml') {
      try {
        const decoded = Buffer.from(match[2], 'base64').toString('utf8').toLowerCase();
        if (decoded.includes('<script') || decoded.includes('javascript:') || decoded.includes('onload=') || decoded.includes('onerror=')) {
          return sendError(req, res, 400, "INVALID_FILE", "Arquivo SVG contém conteúdo malicioso.");
        }
      } catch (e) {
        return sendError(req, res, 400, "INVALID_FILE", "Falha ao processar arquivo SVG.");
      }
    }

    tenant.customLogoUrl = data;
    if (!(tenant as any).branding) {
      (tenant as any).branding = {
        logoUrl: data,
        faviconUrl: '',
        primaryColor: '#3B82F6',
        secondaryColor: '#D4AF37',
        accentColor: '#3B82F6',
        backgroundColor: '#0A192F',
        lightMode: false,
        darkMode: true,
        productName: 'E³I Processos Inteligentes'
      };
    } else {
      (tenant as any).branding.logoUrl = data;
    }

    tenant.customLogoUrl = data;
    if (!(tenant as any).branding) {
      (tenant as any).branding = {
        logoUrl: data,
        faviconUrl: '',
        primaryColor: '#3B82F6',
        secondaryColor: '#D4AF37',
        accentColor: '#3B82F6',
        backgroundColor: '#0A192F',
        lightMode: false,
        darkMode: true,
        productName: 'E³I Processos Inteligentes'
      };
    } else {
      (tenant as any).branding.logoUrl = data;
    }

    res.json({ success: true, logoUrl: data });
  });

  // --- Observability, Health & Cost Monitoring (Fase 01A.8) in Test Server ---
  app.get("/api/health/live", (req: any, res: any) => {
    res.json({ status: "UP", timestamp: new Date().toISOString() });
  });

  app.get("/api/health/ready", (req: any, res: any) => {
    const checks = {
      database: { status: "UP", latencyMs: 2, message: "Conexão estabelecida" },
      storage: { status: "UP", latencyMs: 5, message: "Storage operacional" },
      queue: { status: "UP", latencyMs: 1, message: "Fila em repouso" },
      notifications: { status: "UP", latencyMs: 3, message: "Provedor ativo" }
    };
    res.json({ status: "UP", checks, timestamp: new Date().toISOString() });
  });

  app.get("/api/health/details", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    if (user.role !== 'E3I_ADMIN') {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso restrito a E3I_ADMIN.");
    }

    const metrics = testDb.usageMetrics || [];
    res.json({
      status: "UP",
      environment: process.env.NODE_ENV || "test",
      version: "1.0.8",
      dependencies: [
        { name: "Database", status: "UP", latencyMs: 2 },
        { name: "Storage", status: "UP", latencyMs: 5 },
        { name: "Queue", status: "UP", latencyMs: 1 },
        { name: "NotificationEngine", status: "UP", latencyMs: 3 }
      ],
      metricsSummary: {
        totalRequests: metrics.filter((m: any) => m.metricType === 'API_REQUEST').reduce((acc: number, m: any) => acc + m.quantity, 0),
        totalEmails: metrics.filter((m: any) => m.metricType === 'EMAIL_SENT').reduce((acc: number, m: any) => acc + m.quantity, 0)
      },
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/observability/metrics", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const allowedRoles = ['ADMIN', 'ORGANIZATION_ADMIN', 'E3I_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso negado.");
    }

    let metrics = testDb.usageMetrics || [];
    if (user.role !== 'E3I_ADMIN') {
      metrics = metrics.filter((m: any) => m.organizationId === user.tenantId);
    }

    res.json({ metrics });
  });

  app.get("/api/observability/costs", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const allowedRoles = ['ADMIN', 'ORGANIZATION_ADMIN', 'E3I_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso negado.");
    }

    let metrics = testDb.usageMetrics || [];
    if (user.role !== 'E3I_ADMIN') {
      metrics = metrics.filter((m: any) => m.organizationId === user.tenantId);
    }

    const rates = testDb.costRates || [];
    const calculatedCosts = metrics.map((m: any) => {
      const rate = rates.find((cr: any) => cr.metricType === m.metricType);
      const unitPrice = rate ? rate.unitPrice : 0;
      const estimatedCost = m.quantity * unitPrice;
      return {
        ...m,
        unitPrice,
        estimatedCost: parseFloat(estimatedCost.toFixed(4)),
        currency: rate?.currency || 'BRL'
      };
    });

    const totalEstimatedCost = calculatedCosts.reduce((acc: number, c: any) => acc + c.estimatedCost, 0);

    res.json({
      costs: calculatedCosts,
      totalEstimatedCost: parseFloat(totalEstimatedCost.toFixed(2)),
      currency: 'BRL'
    });
  });

  app.get("/api/observability/alerts", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const allowedRoles = ['ADMIN', 'ORGANIZATION_ADMIN', 'E3I_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso negado.");
    }

    res.json({ alerts: testDb.alerts || [] });
  });

  app.get("/api/observability/dashboard", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const allowedRoles = ['ADMIN', 'ORGANIZATION_ADMIN', 'E3I_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso negado.");
    }

    let metrics = testDb.usageMetrics || [];
    if (user.role !== 'E3I_ADMIN') {
      metrics = metrics.filter((m: any) => m.organizationId === user.tenantId);
    }

    const rates = testDb.costRates || [];
    const calculatedCosts = metrics.map((m: any) => {
      const rate = rates.find((cr: any) => cr.metricType === m.metricType);
      const unitPrice = rate ? rate.unitPrice : 0;
      return m.quantity * unitPrice;
    });
    const totalCost = calculatedCosts.reduce((a: number, b: number) => a + b, 0);

    const notifications = testDb.notifications || [];
    const alerts = testDb.alerts || [];

    res.json({
      status: "UP",
      database: { status: "UP", latencyMs: 2 },
      notifications: { status: "UP", totalSent: notifications.length },
      queue: { status: "UP", pendingCount: notifications.filter((n: any) => n.status === 'PENDING').length },
      storage: { status: "UP", usageBytes: metrics.filter((m: any) => m.metricType === 'STORAGE_BYTES').reduce((a: number, b: any) => a + b.quantity, 0) },
      errorRate: "0.02%",
      avgLatencyMs: 142,
      totalRequests: metrics.filter((m: any) => m.metricType === 'API_REQUEST').reduce((a: number, b: any) => a + b.quantity, 0),
      estimatedCost: parseFloat(totalCost.toFixed(2)),
      alerts: user.role === 'E3I_ADMIN' ? alerts : alerts.filter((a: any) => a.severity === 'CRITICAL'),
      lastUpdated: new Date().toISOString()
    });
  });

  // --- Backup, Disaster Recovery & Operational Continuity (Fase 01A.9) in Test Server ---
  app.get("/api/operational-mode", (req: any, res: any) => {
    res.json({ operationalMode: testDb.operationalMode || 'NORMAL' });
  });

  app.post("/api/maintenance-mode", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    if (user.role !== 'E3I_ADMIN') {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso restrito a E3I_ADMIN.");
    }
    const { enabled } = req.body;
    testDb.operationalMode = enabled ? 'MAINTENANCE' : 'NORMAL';
    testDb.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      organizationId: user.tenantId,
      actorUserId: user.id,
      targetType: 'SYSTEM',
      targetId: 'operational-mode',
      action: enabled ? 'MAINTENANCE_MODE_ENABLED' : 'MAINTENANCE_MODE_DISABLED',
      result: 'SUCCESS',
      metadata: { operationalMode: testDb.operationalMode }
    });
    res.json({ success: true, operationalMode: testDb.operationalMode });
  });

  app.get("/api/backups", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    if (!['ADMIN', 'ORGANIZATION_ADMIN', 'E3I_ADMIN'].includes(user.role)) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso negado.");
    }
    let list = testDb.backupJobs || [];
    if (user.role !== 'E3I_ADMIN') {
      list = list.filter((b: any) => b.organizationId === user.tenantId || b.scope === 'GLOBAL');
    }
    res.json({ items: list, total: list.length });
  });

  app.post("/api/backups", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    if (!['ADMIN', 'ORGANIZATION_ADMIN', 'E3I_ADMIN'].includes(user.role)) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso negado.");
    }
    const { type = 'FULL', scope = 'GLOBAL' } = req.body;
    const bkpId = `bkp-${Date.now()}`;
    const newBkp = {
      id: bkpId,
      type,
      scope,
      organizationId: user.role === 'E3I_ADMIN' ? null : user.tenantId,
      status: 'SUCCEEDED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      storageLocation: `secure-bucket/backup-${bkpId}.tar.gz`,
      checksum: `sha256-${Math.random().toString(36).substring(2)}`,
      sizeBytes: 12500000,
      initiatedByUserId: user.id,
      errorCode: null,
      metadata: { rpoTargetMinutes: 1440, rtoTargetMinutes: 240 },
      createdAt: new Date().toISOString()
    };
    if (!testDb.backupJobs) testDb.backupJobs = [];
    testDb.backupJobs.unshift(newBkp);
    testDb.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      organizationId: user.tenantId,
      actorUserId: user.id,
      targetType: 'BACKUP',
      targetId: bkpId,
      action: 'BACKUP_SUCCEEDED',
      result: 'SUCCESS',
      metadata: { type, scope }
    });
    res.json({ success: true, backup: newBkp });
  });

  app.post("/api/backups/:id/restore", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    if (user.role !== 'E3I_ADMIN') {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Restauração global restrita a E3I_ADMIN.");
    }
    const { id } = req.params;
    const bkp = (testDb.backupJobs || []).find((b: any) => b.id === id);
    if (!bkp) {
      return sendError(req, res, 404, "NOT_FOUND", "Backup não encontrado.");
    }
    const rstId = `rst-${Date.now()}`;
    const restoreJob = {
      id: rstId,
      backupJobId: id,
      scope: bkp.scope,
      organizationId: bkp.organizationId,
      status: 'SUCCEEDED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      initiatedByUserId: user.id,
      validationResult: 'CHECKSUM_VALIDATED_INTEGRITY_OK',
      errorCode: null,
      metadata: {},
      createdAt: new Date().toISOString()
    };
    if (!testDb.restoreJobs) testDb.restoreJobs = [];
    testDb.restoreJobs.unshift(restoreJob);
    testDb.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      organizationId: user.tenantId,
      actorUserId: user.id,
      targetType: 'RESTORE',
      targetId: rstId,
      action: 'RESTORE_SUCCEEDED',
      result: 'SUCCESS',
      metadata: { backupJobId: id }
    });
    res.json({ success: true, restoreJob });
  });

  app.get("/api/backups/restore-jobs", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    if (user.role !== 'E3I_ADMIN') {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso restrito a E3I_ADMIN.");
    }
    res.json({ items: testDb.restoreJobs || [], total: (testDb.restoreJobs || []).length });
  });

  app.post("/api/backups/dr-test", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    if (user.role !== 'E3I_ADMIN') {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso restrito a E3I_ADMIN.");
    }
    const { backupJobId } = req.body;
    const bkp = (testDb.backupJobs || []).find((b: any) => b.id === backupJobId);
    if (!bkp) return sendError(req, res, 404, "NOT_FOUND", "Backup não encontrado.");

    const drTestId = `drt-${Date.now()}`;
    const drTest = {
      id: drTestId,
      backupJobId,
      restoreJobId: 'rst-simulated',
      status: 'SUCCEEDED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      rpoObservedMinutes: 12,
      rtoObservedMinutes: 38,
      findings: 'Teste de recuperação simulado com sucesso. RPO e RTO dentro das metas.',
      createdAt: new Date().toISOString()
    };
    if (!testDb.disasterRecoveryTests) testDb.disasterRecoveryTests = [];
    testDb.disasterRecoveryTests.unshift(drTest);
    testDb.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      organizationId: user.tenantId,
      actorUserId: user.id,
      targetType: 'DISASTER_RECOVERY_TEST',
      targetId: drTestId,
      action: 'DISASTER_RECOVERY_TEST_COMPLETED',
      result: 'SUCCESS',
      metadata: { rpo: 12, rto: 38 }
    });
    res.json({ success: true, disasterRecoveryTest: drTest });
  });

  app.get("/api/backups/dr-tests", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    if (user.role !== 'E3I_ADMIN') {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso restrito a E3I_ADMIN.");
    }
    res.json({ items: testDb.disasterRecoveryTests || [], total: (testDb.disasterRecoveryTests || []).length });
  });

  app.get("/api/tenants/:tenantId/export", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find(s => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find(u => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const { tenantId } = req.params;
    if (user.role !== 'E3I_ADMIN' && user.tenantId !== tenantId) {
      return sendError(req, res, 403, "PERMISSION_DENIED", "Acesso negado ao export da organização.");
    }

    const tenant = testDb.tenants.find((t: any) => t.id === tenantId);
    if (!tenant) return sendError(req, res, 404, "NOT_FOUND", "Organização não encontrada.");

    const tenantUsers = testDb.users
      .filter((u: any) => u.tenantId === tenantId)
      .map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status
      }));

    res.json({
      exportedAt: new Date().toISOString(),
      tenant,
      users: tenantUsers,
      metrics: (testDb.usageMetrics || []).filter((m: any) => m.organizationId === tenantId),
      auditLogs: (testDb.auditLogs || []).filter((l: any) => l.organizationId === tenantId)
    });
  });

  // --- Sprint 2.1: Discovery Engine Adaptativo & Context Package v2 (Test Server) ---
  const DISCOVERY_QUESTIONS: Record<string, Array<{ id: string; text: string; example: string }>> = {
    company: [
      { id: 'comp-1', text: 'Qual é o principal produto ou serviço da empresa?', example: 'Ex: Consultoria e desenvolvimento de software sob medida.' },
      { id: 'comp-2', text: 'Quantas pessoas trabalham na empresa atualmente?', example: 'Ex: Cerca de 30 colaboradores.' },
      { id: 'comp-3', text: 'Em quais cidades ou regiões vocês atuam?', example: 'Ex: Âmbito nacional e América Latina.' }
    ],
    strategy: [
      { id: 'strat-1', text: 'Qual é o principal objetivo da empresa neste momento?', example: 'Ex: Escalar vendas e melhorar eficiência operacional.' },
      { id: 'strat-2', text: 'Quais são os três maiores desafios para alcançar esse objetivo?', example: 'Ex: Processos manuais, falta de integração e retenção de talentos.' },
      { id: 'strat-3', text: 'Como vocês sabem se a empresa está indo bem no mês?', example: 'Ex: Através da receita recorrente e margem EBITDA.' }
    ],
    organization: [
      { id: 'org-1', text: 'Quais áreas ou departamentos existem hoje?', example: 'Ex: Comercial, Desenvolvimento, Suporte e Financeiro.' },
      { id: 'org-2', text: 'Quem toma as principais decisões do dia a dia?', example: 'Ex: Diretores executivos em alinhamento com gerentes.' },
      { id: 'org-3', text: 'Existem atividades que dependem muito de uma única pessoa?', example: 'Ex: Sim, a infraestrutura depende do CTO.' }
    ],
    operations: [
      { id: 'ops-1', text: 'Conte de forma simples como o cliente chega até vocês e recebe o produto ou serviço.', example: 'Ex: Inbound marketing, proposta comercial e onboarding guiado.' },
      { id: 'ops-2', text: 'Onde mais ocorrem atrasos ou gargalos na operação?', example: 'Ex: No processo de homologação de contratos e suporte N2.' },
      { id: 'ops-3', text: 'Quais atividades geram mais retrabalho ou correções?', example: 'Ex: Correção de bugs por desalinhamento de requisitos.' }
    ],
    systems: [
      { id: 'sys-1', text: 'Quais sistemas ou softwares vocês utilizam no dia a dia?', example: 'Ex: Jira, GitHub, Slack, ERP financeiro.' },
      { id: 'sys-2', text: 'Existem informações que precisam ser digitadas em mais de um sistema?', example: 'Ex: Sim, contratos no CRM e faturamento no ERP.' },
      { id: 'sys-3', text: 'Quais controles ou relatórios ainda ficam em planilhas?', example: 'Ex: Controle de metas e orçamento de marketing.' }
    ],
    indicators: [
      { id: 'ind-1', text: 'Quais números ou indicadores vocês acompanham regularmente?', example: 'Ex: Churn rate, MRR, tempo médio de atendimento.' },
      { id: 'ind-2', text: 'Existem metas formais estabelecidas para a equipe?', example: 'Ex: Sim, OKRs trimestrais por departamento.' }
    ],
    knowledge: [
      { id: 'know-1', text: 'Existem procedimentos ou manuais escritos para as tarefas?', example: 'Ex: Documentação em Confluence e Notion.' },
      { id: 'know-2', text: 'Onde ficam armazenados contratos, manuais e políticas da empresa?', example: 'Ex: Google Drive corporativo e repositório seguro.' }
    ],
    findings: [
      { id: 'find-1', text: 'Qual é o maior gargalo operacional que vocês enfrentam hoje?', example: 'Ex: Comunicação descentralizada entre vendas e entrega.' },
      { id: 'find-2', text: 'Qual oportunidade de melhoria traria mais impacto rápido para o negócio?', example: 'Ex: Automatizar o fluxo de proposta até o contrato assinado.' }
    ]
  };

  const DIMENSION_ORDER = ['company', 'strategy', 'organization', 'operations', 'systems', 'indicators', 'knowledge', 'findings'];

  function getNextStep(currentDim: string, currentQId: string) {
    const questions = DISCOVERY_QUESTIONS[currentDim] || [];
    const idx = questions.findIndex(q => q.id === currentQId);
    if (idx >= 0 && idx < questions.length - 1) {
      return { dimension: currentDim, question: questions[idx + 1], questionNumber: idx + 2 };
    }
    const dimIdx = DIMENSION_ORDER.indexOf(currentDim);
    if (dimIdx >= 0 && dimIdx < DIMENSION_ORDER.length - 1) {
      const nextDim = DIMENSION_ORDER[dimIdx + 1];
      const nextQuestions = DISCOVERY_QUESTIONS[nextDim];
      return { dimension: nextDim, question: nextQuestions[0], questionNumber: 1 };
    }
    return null;
  }

  app.post("/api/discovery/extract-context", async (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find((s: any) => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find((u: any) => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    if (!user.tenantId) {
      return sendError(req, res, 401, "AI_TENANT_CONTEXT_REQUIRED", "TenantContext é obrigatório para execução de IA.");
    }

    if (!AIConfig.enabled) {
      return sendError(req, res, 503, "AI_FEATURE_DISABLED", "Recursos de IA desativados no momento.");
    }

    const { text, promptVersion } = req.body;

    try {
      const harness = new AIHarness(globalPromptRegistry);
      const result = await harness.execute({
        operation: 'discovery.extract-business-context',
        tenantContext: {
          userId: user.id,
          organizationId: user.tenantId,
          membershipId: (user as any).membershipId || 'mbr-1',
          role: user.role || 'MEMBER',
          sessionId: req.headers['x-session-id'] || 'session-1',
        },
        promptId: 'discovery.extract-business-context',
        promptVersion: promptVersion ? parseInt(promptVersion, 10) : undefined,
        input: { text },
      });

      if (!testDb.llmUsageLogs) testDb.llmUsageLogs = [];
      testDb.llmUsageLogs.unshift({
        id: `llm-${Date.now()}`,
        tenantId: user.tenantId,
        model: result.model,
        tokens: result.usage.inputTokens !== null && result.usage.outputTokens !== null ? result.usage.inputTokens + result.usage.outputTokens : null,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cachedTokens: result.usage.cachedTokens,
        reason: 'discovery_extract_business_context',
        durationMs: result.latencyMs,
        cost: null,
        timestamp: new Date().toISOString()
      });

      res.json(result);
    } catch (err: any) {
      const message = err.message || 'AI_PROVIDER_ERROR';
      const statusCode = message.includes('AI_FEATURE_DISABLED') ? 503
        : message.includes('AI_PROMPT_NOT_FOUND') ? 404
        : message.includes('AI_PROMPT_NOT_ACTIVE') ? 400
        : message.includes('AI_INPUT_VALIDATION_ERROR') ? 400
        : message.includes('AI_OUTPUT_VALIDATION_ERROR') ? 502
        : message.includes('AI_TENANT_CONTEXT_REQUIRED') ? 401
        : message.includes('AI_PROVIDER_TIMEOUT') ? 504
        : 500;

      sendError(req, res, statusCode, message.split(':')[0].trim(), message);
    }
  });

  app.post("/api/discovery/start", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find((s: any) => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find((u: any) => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    let discSession = (testDb.discoverySessions || []).find((s: any) => s.tenantId === user.tenantId && s.status !== 'COMPLETED');
    const isResumed = !!discSession;

    if (!discSession) {
      discSession = {
        id: `dsc-${Date.now()}`,
        tenantId: user.tenantId,
        userId: user.id,
        status: 'IN_PROGRESS',
        currentDimension: 'company',
        currentQuestionIndex: 0,
        answers: [],
        confidenceScores: { company: 50, strategy: 50, organization: 50, operations: 50, systems: 50, indicators: 50, knowledge: 50, findings: 50 },
        inconsistencies: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (!testDb.discoverySessions) testDb.discoverySessions = [];
      testDb.discoverySessions.push(discSession);
    }

    const currentDimQuestions = DISCOVERY_QUESTIONS[discSession.currentDimension];
    const currentQ = currentDimQuestions[discSession.currentQuestionIndex] || currentDimQuestions[0];

    testDb.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      organizationId: user.tenantId,
      actorUserId: user.id,
      targetType: 'DISCOVERY',
      targetId: discSession.id,
      action: isResumed ? 'DISCOVERY_RESUMED' : 'DISCOVERY_STARTED',
      result: 'SUCCESS',
      metadata: { dimension: discSession.currentDimension }
    } as any);

    res.json({
      ...discSession,
      currentQuestion: currentQ,
      questionNumber: discSession.currentQuestionIndex + 1,
      progressPercent: Math.round((discSession.answers.length / 21) * 100)
    });
  });

  app.get("/api/discovery/session", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find((s: any) => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find((u: any) => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    let discSession = (testDb.discoverySessions || []).find((s: any) => s.tenantId === user.tenantId && s.status !== 'COMPLETED');
    if (!discSession) {
      return sendError(req, res, 404, "NOT_FOUND", "Nenhuma sessão de Discovery ativa.");
    }

    const currentDimQuestions = DISCOVERY_QUESTIONS[discSession.currentDimension] || [];
    const currentQ = currentDimQuestions[discSession.currentQuestionIndex] || currentDimQuestions[0];
    const completedDims = Array.from(new Set(discSession.answers.map((a: any) => a.dimension)));

    res.json({
      ...discSession,
      currentQuestion: currentQ,
      questionNumber: discSession.currentQuestionIndex + 1,
      completedDimensions: completedDims,
      progressPercent: Math.min(100, Math.round((discSession.answers.length / 21) * 100))
    });
  });

  app.post("/api/discovery/answer", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find((s: any) => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find((u: any) => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const { dimension, questionId, answer, isDontKnow } = req.body;
    let discSession = (testDb.discoverySessions || []).find((s: any) => s.tenantId === user.tenantId && s.status !== 'COMPLETED');
    if (!discSession) return sendError(req, res, 404, "NOT_FOUND", "Sessão não encontrada.");

    const dimQuestions = DISCOVERY_QUESTIONS[dimension] || [];
    const qObj = dimQuestions.find(q => q.id === questionId);

    let currentConf = discSession.confidenceScores[dimension] || 50;
    if (isDontKnow) {
      currentConf = Math.max(10, currentConf - 20);
    } else {
      currentConf = Math.min(100, currentConf + 15);
    }
    discSession.confidenceScores[dimension] = currentConf;

    const existingAnsIndex = discSession.answers.findIndex((a: any) => a.questionId === questionId);
    const answerEntry = {
      dimension,
      questionId,
      questionText: qObj?.text || questionId,
      answer,
      isDontKnow: !!isDontKnow,
      confidence: currentConf,
      timestamp: new Date().toISOString()
    };
    if (existingAnsIndex >= 0) {
      discSession.answers[existingAnsIndex] = answerEntry;
    } else {
      discSession.answers.push(answerEntry);
    }

    if (answer && answer.toLowerCase().includes('contradição') || (dimension === 'company' && answer.length < 3)) {
      const inc = { id: `inc-${Date.now()}`, message: `Possível ponto de atenção na dimensão ${dimension}: resposta vaga ou contraditória.` };
      discSession.inconsistencies.push(inc);
      testDb.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        organizationId: user.tenantId,
        actorUserId: user.id,
        targetType: 'DISCOVERY',
        targetId: discSession.id,
        action: 'DISCOVERY_INCONSISTENCY_FOUND',
        result: 'WARNING',
        metadata: { dimension, questionId }
      } as any);
    }

    if (!isDontKnow && answer && answer.length > 20) {
      if (!testDb.llmUsageLogs) testDb.llmUsageLogs = [];
      testDb.llmUsageLogs.unshift({
        id: `llm-${Date.now()}`,
        tenantId: user.tenantId,
        model: AIConfig.models.fast || 'fast-model',
        tokens: null,
        inputTokens: null,
        outputTokens: null,
        cachedTokens: null,
        reason: 'interpret_free_response',
        durationMs: null,
        cost: null,
        timestamp: new Date().toISOString()
      });
    }

    const next = getNextStep(dimension, questionId);
    if (!next) {
      discSession.status = 'REVIEW';
      testDb.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        organizationId: user.tenantId,
        actorUserId: user.id,
        targetType: 'DISCOVERY',
        targetId: discSession.id,
        action: 'DISCOVERY_REVIEW_STARTED',
        result: 'SUCCESS',
        metadata: {}
      } as any);
    } else {
      discSession.currentDimension = next.dimension;
      const nextDimQuestions = DISCOVERY_QUESTIONS[next.dimension];
      discSession.currentQuestionIndex = nextDimQuestions.findIndex(q => q.id === next.question.id);
    }
    discSession.updatedAt = new Date().toISOString();

    testDb.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      organizationId: user.tenantId,
      actorUserId: user.id,
      targetType: 'DISCOVERY',
      targetId: discSession.id,
      action: 'DISCOVERY_ANSWER_SAVED',
      result: 'SUCCESS',
      metadata: { dimension, questionId }
    } as any);

    const currQ = discSession.status === 'REVIEW' ? null : (DISCOVERY_QUESTIONS[discSession.currentDimension][discSession.currentQuestionIndex]);

    res.json({
      ...discSession,
      currentQuestion: currQ,
      questionNumber: discSession.currentQuestionIndex + 1,
      progressPercent: Math.min(100, Math.round((discSession.answers.length / 21) * 100))
    });
  });

  app.post("/api/discovery/review", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find((s: any) => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find((u: any) => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    let discSession = (testDb.discoverySessions || []).find((s: any) => s.tenantId === user.tenantId && s.status !== 'COMPLETED');
    if (!discSession) {
      discSession = (testDb.discoverySessions || []).find((s: any) => s.tenantId === user.tenantId);
    }
    if (!discSession) return sendError(req, res, 404, "NOT_FOUND", "Nenhuma sessão de Discovery encontrada.");

    discSession.status = 'COMPLETED';
    discSession.completedAt = new Date().toISOString();

    const getAns = (dim: string, qIdx: number) => {
      const list = discSession.answers.filter((a: any) => a.dimension === dim);
      return list[qIdx]?.answer || '';
    };

    if (!testDb.contextPackages) testDb.contextPackages = [];
    const existingPkgs = testDb.contextPackages.filter((p: any) => p.tenantId === user.tenantId);
    existingPkgs.forEach((p: any) => p.meta.status = 'SUPERSEDED');

    const versionNum = existingPkgs.length + 1;
    const overallConf = Math.round((Object.values(discSession.confidenceScores || {}) as any[]).reduce((a: number, b: any) => a + Number(b), 0) / 8);

    const cp = {
      id: `cp-${Date.now()}`,
      tenantId: user.tenantId,
      version: `v2.${versionNum}`,
      meta: {
        version: `2.${versionNum}`,
        tenantId: user.tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorId: user.id,
        status: 'VALIDATED'
      },
      company: {
        product: getAns('company', 0),
        teamSize: getAns('company', 1),
        locations: getAns('company', 2)
      },
      strategy: {
        objective: getAns('strategy', 0),
        challenges: getAns('strategy', 1),
        successMetric: getAns('strategy', 2)
      },
      organization: {
        departments: getAns('organization', 0),
        decisionMakers: getAns('organization', 1),
        singlePointDependencies: getAns('organization', 2)
      },
      operations: {
        flow: getAns('operations', 0),
        bottlenecks: getAns('operations', 1),
        rework: getAns('operations', 2)
      },
      systems: {
        software: getAns('systems', 0),
        redundancy: getAns('systems', 1),
        spreadsheets: getAns('systems', 2)
      },
      indicators: {
        metrics: getAns('indicators', 0),
        goals: getAns('indicators', 1)
      },
      knowledge: {
        procedures: getAns('knowledge', 0),
        repository: getAns('knowledge', 1)
      },
      findings: {
        majorBottleneck: getAns('findings', 0),
        highImpactOpportunity: getAns('findings', 1)
      },
      confidence: {
        overall: overallConf,
        dimensions: discSession.confidenceScores
      },
      rawAnswers: discSession.answers,
      inconsistencies: discSession.inconsistencies,
      createdAt: new Date().toISOString()
    };

    testDb.contextPackages.unshift(cp);

    testDb.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      organizationId: user.tenantId,
      actorUserId: user.id,
      targetType: 'DISCOVERY',
      targetId: discSession.id,
      action: 'DISCOVERY_COMPLETED',
      result: 'SUCCESS',
      metadata: {}
    } as any);

    testDb.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      organizationId: user.tenantId,
      actorUserId: user.id,
      targetType: 'CONTEXT_PACKAGE',
      targetId: cp.id,
      action: 'CONTEXT_PACKAGE_CREATED',
      result: 'SUCCESS',
      metadata: { version: cp.version }
    } as any);

    testDb.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      organizationId: user.tenantId,
      actorUserId: user.id,
      targetType: 'CONTEXT_PACKAGE',
      targetId: cp.id,
      action: 'CONTEXT_PACKAGE_VERSION_CREATED',
      result: 'SUCCESS',
      metadata: { version: cp.version }
    } as any);

    res.json({ success: true, contextPackage: cp });
  });

  app.get("/api/business-context", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find((s: any) => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find((u: any) => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const cp = (testDb.contextPackages || []).find((p: any) => p.tenantId === user.tenantId && p.meta?.status === 'VALIDATED') || (testDb.contextPackages || []).find((p: any) => p.tenantId === user.tenantId);
    if (!cp) {
      return sendError(req, res, 404, "NOT_FOUND", "Nenhum Context Package encontrado para a organização.");
    }

    res.json(cp);
  });

  // Strategy Canvas Endpoints (Sprint 2.2 Test Server)
  app.get("/api/strategy-canvas", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find((s: any) => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find((u: any) => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    if (!testDb.strategyCanvases) testDb.strategyCanvases = [];
    let canvas = testDb.strategyCanvases.find((c: any) => c.tenantId === user.tenantId);
    if (!canvas) {
      const cp = (testDb.contextPackages || []).find((p: any) => p.tenantId === user.tenantId);
      canvas = {
        id: `sc-${Date.now()}`,
        tenantId: user.tenantId,
        version: cp ? cp.version : 'v2.1',
        direction: {
          mainObjective: cp?.strategy?.objective || 'Escalar operações e garantir eficiência de entrega',
          horizon: '12 meses',
          focus: 'Crescimento Sustentável',
          mission: 'Fornecer excelência em processos e consultoria de alto valor.',
          vision: 'Ser referência nacional em automação e eficiência operacional até 2028.',
          isSuggestion: true,
          status: 'SUGGESTION'
        },
        objectives: [
          {
            id: 'obj-1',
            title: cp?.strategy?.objective || 'Aumentar margem operacional em 15%',
            description: 'Eliminar gargalos e retrabalho mapeados no Discovery.',
            priority: 'Alta',
            horizon: '12 meses',
            owner: 'Diretoria Executiva',
            confidence: 88,
            source: 'Discovery / Estratégia',
            status: 'CONFIRMED'
          }
        ],
        priorities: [
          { id: 'pri-1', title: 'Automação de fluxos críticos de atendimento', level: 'Alta', order: 1 }
        ],
        indicators: [
          { id: 'ind-1', name: 'Tempo Médio de Atendimento (TMA)', target: '< 24h', current: '36h', isMissing: false, isSuggestion: false, status: 'CONFIRMED' }
        ],
        valueChain: [
          { step: '1. Aquisição & Entrada', description: 'Captação de clientes e levantamento de necessidades.', source: 'Discovery' }
        ],
        risks: [
          { id: 'rsk-1', category: 'operacional', description: cp?.operations?.bottlenecks || 'Gargalos operacionais.', origin: 'Discovery', estimatedImpact: 'Alto', confidence: 90, status: 'CONFIRMED' }
        ],
        hypotheses: [],
        gaps: [],
        alignments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      testDb.strategyCanvases.push(canvas);
    }

    res.json(canvas);
  });

  app.post("/api/strategy-canvas/objective", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find((s: any) => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find((u: any) => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    if (!testDb.strategyCanvases) testDb.strategyCanvases = [];
    let canvas = testDb.strategyCanvases.find((c: any) => c.tenantId === user.tenantId);
    if (!canvas) return sendError(req, res, 404, "NOT_FOUND", "Strategy Canvas não encontrado.");

    const { objectiveId, status } = req.body;
    if (objectiveId) {
      const obj = canvas.objectives.find((o: any) => o.id === objectiveId);
      if (obj && status) {
        obj.status = status;
      }
    }
    canvas.updatedAt = new Date().toISOString();
    res.json(canvas);
  });

  app.post("/api/strategy-canvas/complete", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find((s: any) => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find((u: any) => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    if (!testDb.strategyCanvases) testDb.strategyCanvases = [];
    let canvas = testDb.strategyCanvases.find((c: any) => c.tenantId === user.tenantId);
    if (!canvas) return sendError(req, res, 404, "NOT_FOUND", "Strategy Canvas não encontrado.");

    canvas.version = 'v2.2';
    canvas.updatedAt = new Date().toISOString();

    if (!testDb.contextPackages) testDb.contextPackages = [];
    const cp = {
      id: `cp-${Date.now()}`,
      tenantId: user.tenantId,
      version: 'v2.2',
      meta: { version: '2.2', status: 'VALIDATED' },
      createdAt: new Date().toISOString()
    };
    testDb.contextPackages.unshift(cp);

    res.json({ success: true, canvas, contextPackage: cp });
  });

  app.get("/api/discovery/metrics", (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map((c: string) => c.trim());
      for (const c of cookies) {
        if (c.startsWith('e3i_token=')) {
          token = c.substring(10);
          break;
        }
      }
    }
    if (!token) return sendError(req, res, 401, "INVALID_SESSION", "Sessão não autenticada.");
    const session = testDb.sessions.find((s: any) => s.token === token && !s.revokedAt);
    if (!session) return sendError(req, res, 401, "INVALID_SESSION", "Sessão inválida.");
    const user = testDb.users.find((u: any) => u.id === session.userId);
    if (!user) return sendError(req, res, 401, "INVALID_SESSION", "Usuário não encontrado.");

    const tenantLlms = (testDb.llmUsageLogs || []).filter((l: any) => l.tenantId === user.tenantId);
    const hasRealTokens = tenantLlms.some((l: any) => l.tokens !== null && l.tokens !== undefined);
    const hasRealCost = tenantLlms.some((l: any) => l.cost !== null && l.cost !== undefined);
    const totalTokens = hasRealTokens ? tenantLlms.reduce((acc: number, l: any) => acc + (l.tokens || 0), 0) : null;
    const totalCost = hasRealCost ? tenantLlms.reduce((acc: number, l: any) => acc + (l.cost || 0), 0) : null;

    res.json({
      tenantId: user.tenantId,
      llmCallsCount: tenantLlms.length,
      totalTokens,
      estimatedCost: totalCost !== null ? parseFloat(totalCost.toFixed(4)) : null,
      avgLatencyMs: tenantLlms.some((l: any) => l.durationMs !== null && l.durationMs !== undefined)
        ? Math.round(tenantLlms.filter((l: any) => l.durationMs !== null).reduce((a: number, b: any) => a + (b.durationMs || 0), 0) / Math.max(1, tenantLlms.filter((l: any) => l.durationMs !== null).length))
        : null,
      dontKnowCount: 0,
      dropOffRate: "0.0%"
    });
  });

  return app;
}

export const request = supertest(createTestApp());
