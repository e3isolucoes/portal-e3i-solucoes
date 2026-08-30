import { useAuth } from '../context/AuthContext';
import { PermissionCode, ROLE_PERMISSIONS } from '../permissions';

export function usePermissions() {
  const { user } = useAuth();

  const can = (permission: PermissionCode): boolean => {
    if (!user || !user.role) return false;
    const normalizedRole = user.role.toUpperCase();
    if (normalizedRole === 'E3I_ADMIN' || normalizedRole === 'ADMIN') return true;
    const perms = ROLE_PERMISSIONS[normalizedRole as keyof typeof ROLE_PERMISSIONS];
    if (!perms) return false;
    return perms.includes(permission);
  };

  const hasAnyPermission = (permissions: PermissionCode[]): boolean => {
    return permissions.some(p => can(p));
  };

  const hasAllPermissions = (permissions: PermissionCode[]): boolean => {
    return permissions.every(p => can(p));
  };

  return {
    can,
    hasAnyPermission,
    hasAllPermissions,
    role: user?.role || 'OPERATOR',
    isPrivileged: user?.role === 'ADMIN' || user?.role === 'E3I_ADMIN',
  };
}
