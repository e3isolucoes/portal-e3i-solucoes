export const mockSessions = [
  {
    id: 'sess-1',
    userId: 'usr-admin-1',
    token: 'token_admin_valid_xyz',
    revokedAt: null,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: 'sess-2',
    userId: 'usr-mgr-1',
    token: 'token_manager_valid_abc',
    revokedAt: null,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: 'sess-3',
    userId: 'usr-op-1',
    token: 'token_revoked_123',
    revokedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  }
];
