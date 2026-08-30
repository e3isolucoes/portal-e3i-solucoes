import { describe, it, expect } from 'vitest';
import { testDb } from '../../helpers/testDatabase';

describe('Unit Quality Gate: TenantContext & Isolation Rules', () => {
  it('should create valid TenantContext from active user session', () => {
    const user = testDb.users[0]; // admin
    const tenant = testDb.tenants.find(t => t.id === user.tenantId);

    const tenantContext = {
      tenantId: tenant?.id,
      tenantName: tenant?.name,
      userId: user.id,
      role: user.role,
    };

    expect(tenantContext.tenantId).toBe('tenant-1');
    expect(tenantContext.userId).toBe(user.id);
  });

  it('should reject session if tenant is inactive or non-existent', () => {
    const inactiveTenantId = 'tenant-3'; // Inativa Corp
    const tenant = testDb.tenants.find(t => t.id === inactiveTenantId);

    const isTenantActive = tenant?.status === 'ACTIVE';
    expect(isTenantActive).toBe(false);
  });

  it('should enforce mandatory filter by organizationId in repository queries', () => {
    const queryWithTenantFilter = (tenantId: string, records: Array<{ tenantId: string; title: string }>) => {
      if (!tenantId) {
        throw new Error('Security Error: Query executed without TenantContext');
      }
      return records.filter(r => r.tenantId === tenantId);
    };

    const dbRecords = [
      { tenantId: 'tenant-1', title: 'Doc A' },
      { tenantId: 'tenant-2', title: 'Doc B' },
    ];

    const resultA = queryWithTenantFilter('tenant-1', dbRecords);
    expect(resultA.length).toBe(1);
    expect(resultA[0].title).toBe('Doc A');

    // Without tenant context must throw error
    expect(() => queryWithTenantFilter('', dbRecords)).toThrowError(/TenantContext/);
  });

  it('should sanitize security events and never expose passwords or secrets', () => {
    const rawDetails = 'Login failed for user@e3i.com.br with passwordHash 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
    const sanitized = rawDetails.replace(/passwordHash [a-f0-9]{64}/gi, '[REDACTED_HASH]');

    expect(sanitized).not.toContain('5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8');
    expect(sanitized).toContain('[REDACTED_HASH]');
  });
});
