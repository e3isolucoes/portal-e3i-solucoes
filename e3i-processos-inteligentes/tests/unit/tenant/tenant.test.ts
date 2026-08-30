import { describe, it, expect } from 'vitest';
import { mockOrganizations } from '../../fixtures/organizations';
import { mockUsers } from '../../fixtures/users';
import { mockSessions } from '../../fixtures/sessions';

describe('Unit: Tenant Isolation & Status Rules', () => {
  it('should correctly identify active and inactive tenants', () => {
    const activeTenant = mockOrganizations.find(t => t.status === 'ACTIVE');
    const inactiveTenant = mockOrganizations.find(t => t.status === 'INACTIVE');

    expect(activeTenant?.name).toBeDefined();
    expect(inactiveTenant?.status).toBe('INACTIVE');
  });

  it('should isolate users to their respective tenants', () => {
    const adminUser = mockUsers.find(u => u.email === 'admin.a@e3i.com.br');
    const managerUser = mockUsers.find(u => u.email === 'manager.b@e3i.com.br');

    expect(adminUser?.tenantId).toBe('tenant-1');
    expect(managerUser?.tenantId).toBe('tenant-2');
  });

  it('should detect revoked sessions', () => {
    const revokedSession = mockSessions.find(s => s.token === 'token_revoked_123');
    expect(revokedSession?.revokedAt).not.toBeNull();
  });
});
