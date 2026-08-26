import type { UnifiedPermissionSet } from '@/lib/auth/rbac/role-resolver';

/**
 * Extended permission set that includes permissionIds
 */
interface PermissionSetWithIds extends UnifiedPermissionSet {
    permissionIds?: string[];
}

/**
 * User capabilities derived from permission set
 */
export interface Capabilities {
    permissions: string[];
    collections: string[] | '*';
    canCreateDashboards: boolean;
    canManageUsers: boolean;
    canManageRoles: boolean;
    canApproveQueries: boolean;
    canViewApprovals: boolean;
    isAdmin: boolean;
}

/**
 * Compute user capabilities from permission set
 *
 * PURE FUNCTION
 */
export function computeCapabilities(
    permissionSet: UnifiedPermissionSet
): Capabilities {
    const isAdmin = permissionSet.dataAccess?.collections === '*';
    const permissionSetWithIds = permissionSet as PermissionSetWithIds;
    const permissionIds = permissionSetWithIds.permissionIds || [];

    // For admin users with wildcard data access, treat as having all permissions
    // This includes '*' in the permissions array so checks can handle it
    const effectivePermissions = isAdmin && !permissionIds.includes('*')
        ? ['*', ...permissionIds]
        : permissionIds;

    return {
        permissions: effectivePermissions,
        collections: permissionSet.dataAccess?.collections || [],
        canCreateDashboards: permissionIds.includes('create_dashboard') || isAdmin,
        canManageUsers: permissionIds.includes('manage_users') || isAdmin,
        canManageRoles: permissionIds.includes('manage_roles') || isAdmin,
        canApproveQueries: permissionIds.includes('approve_queries') || isAdmin,
        canViewApprovals: permissionIds.includes('view_query_approvals') || isAdmin,
        isAdmin,
    };
}

/**
 * Check if permission set has specific permission
 *
 * PURE FUNCTION
 */
export function hasPermission(
    permissionSet: UnifiedPermissionSet,
    permissionId: string
): boolean {
    const permissionSetWithIds = permissionSet as PermissionSetWithIds;
    const permissionIds = permissionSetWithIds.permissionIds || [];

    // Wildcard = has all permissions
    if (permissionIds.includes('*')) return true;

    return permissionIds.includes(permissionId);
}
