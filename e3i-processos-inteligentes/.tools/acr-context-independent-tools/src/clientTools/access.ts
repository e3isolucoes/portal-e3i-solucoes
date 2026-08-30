export function canManageClientToolGrants(systemRole?: string | null): boolean {
  return systemRole === 'E3I_ADMIN';
}

export function scopeClientToolsForOrganization<T extends { id: string }>(
  catalog: readonly T[],
  grantedToolIds: readonly string[] = [],
  canManage = false,
): Array<T & { granted: boolean }> {
  const grants = new Set(grantedToolIds);
  const scoped = catalog.map(tool => ({ ...tool, granted: grants.has(tool.id) }));
  return canManage ? scoped : scoped.filter(tool => tool.granted);
}

export function isActiveOrganizationTarget(activeOrganizationId: string, requestedOrganizationId: string): boolean {
  return Boolean(activeOrganizationId) && activeOrganizationId === requestedOrganizationId;
}
