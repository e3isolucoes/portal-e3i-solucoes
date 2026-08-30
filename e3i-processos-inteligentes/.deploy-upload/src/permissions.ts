export type PermissionCode =
  | 'organization.read'
  | 'organization.manage'
  | 'discovery.read'
  | 'discovery.contribute'
  | 'discovery.edit'
  | 'discovery.manage'
  | 'process.read'
  | 'process.create'
  | 'process.edit'
  | 'process.publish'
  | 'process.archive'
  | 'task.read'
  | 'task.execute'
  | 'task.assign'
  | 'task.reassign'
  | 'task.complete'
  | 'document.read'
  | 'document.upload'
  | 'document.delete'
  | 'agent.use'
  | 'agent.approve'
  | 'agent.configure'
  | 'agent.autonomy.manage'
  | 'intelligence.read'
  | 'impact.read'
  | 'user.read'
  | 'user.manage'
  | 'integration.read'
  | 'integration.manage'
  | 'audit.read';

export type UserRole = 'E3I_ADMIN' | 'ADMIN' | 'MANAGER' | 'ANALYST' | 'OPERATOR' | 'AUDITOR';

export const ROLE_PERMISSIONS: Record<UserRole, PermissionCode[]> = {
  E3I_ADMIN: [
    'organization.read',
    'organization.manage',
    'discovery.read',
    'discovery.contribute',
    'discovery.edit',
    'discovery.manage',
    'process.read',
    'process.create',
    'process.edit',
    'process.publish',
    'process.archive',
    'task.read',
    'task.execute',
    'task.assign',
    'task.reassign',
    'task.complete',
    'document.read',
    'document.upload',
    'document.delete',
    'agent.use',
    'agent.approve',
    'agent.configure',
    'agent.autonomy.manage',
    'intelligence.read',
    'impact.read',
    'user.read',
    'user.manage',
    'integration.read',
    'integration.manage',
    'audit.read',
  ],
  ADMIN: [
    'organization.read',
    'organization.manage',
    'discovery.read',
    'discovery.contribute',
    'discovery.edit',
    'discovery.manage',
    'process.read',
    'process.create',
    'process.edit',
    'process.publish',
    'process.archive',
    'task.read',
    'task.execute',
    'task.assign',
    'task.reassign',
    'task.complete',
    'document.read',
    'document.upload',
    'document.delete',
    'agent.use',
    'agent.approve',
    'agent.configure',
    'agent.autonomy.manage',
    'intelligence.read',
    'impact.read',
    'user.read',
    'user.manage',
    'integration.read',
    'integration.manage',
    'audit.read',
  ],
  MANAGER: [
    'organization.read',
    'discovery.read',
    'discovery.contribute',
    'discovery.edit',
    'process.read',
    'process.create',
    'process.edit',
    'process.publish',
    'task.read',
    'task.execute',
    'task.assign',
    'task.complete',
    'document.read',
    'document.upload',
    'agent.use',
    'agent.approve',
    'intelligence.read',
    'impact.read',
    'user.read',
    'integration.read',
  ],
  ANALYST: [
    'organization.read',
    'discovery.read',
    'discovery.contribute',
    'process.read',
    'process.create',
    'process.edit',
    'task.read',
    'task.execute',
    'task.complete',
    'document.read',
    'document.upload',
    'agent.use',
    'intelligence.read',
    'impact.read',
  ],
  OPERATOR: [
    'organization.read',
    'process.read',
    'task.read',
    'task.execute',
    'task.complete',
    'document.read',
    'document.upload',
    'agent.use',
  ],
  AUDITOR: [
    'organization.read',
    'discovery.read',
    'process.read',
    'task.read',
    'document.read',
    'intelligence.read',
    'impact.read',
    'audit.read',
  ],
};

export function hasPermission(role: string, permission: PermissionCode): boolean {
  if (!role) return false;
  const normalizedRole = role.toUpperCase() as UserRole;
  if (normalizedRole === 'E3I_ADMIN' || normalizedRole === 'ADMIN') return true;
  const perms = ROLE_PERMISSIONS[normalizedRole];
  if (!perms) return false;
  return perms.includes(permission);
}
