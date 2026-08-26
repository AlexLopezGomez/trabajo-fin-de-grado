/**
 * Unified Role Resolver
 * 
 * Bridges the gap between built-in roles (admin/supervisor/operator/viewer) and custom roles
 * from the permission_sets collection. This is the SINGLE SOURCE OF TRUTH for
 * resolving role permissions.
 */

import { withAuthDatabase } from '@/lib/db/helpers';
import {
    getBuiltInPermissionSet,
    type BuiltInPermissionSet,
    type DataAccessConfig
} from './built-in-roles';
import type { PermissionSet } from '@/types/rbac';

/**
 * Unified permission set that works for both built-in and custom roles
 */
export interface UnifiedPermissionSet {
    id: string;
    name: string;
    description: string;
    dataAccess: DataAccessConfig;
    permissionIds?: string[];
    isBuiltIn: boolean;
    isCustom: boolean;
}

/**
 * Get permission set for any role (built-in or custom)
 * 
 * This is the primary function that should be used throughout the codebase
 * instead of getBuiltInPermissionSet().
 * 
 * @param roleId - Role identifier (e.g., "admin", "supervisor", "operator", or UUID for custom)
 * @returns Unified permission set or undefined if role not found
 */
export async function getPermissionSetForRole(
    roleId: string
): Promise<UnifiedPermissionSet | undefined> {
    // 1. Try built-in roles first (faster, no DB query)
    const builtIn = await getBuiltInPermissionSet(roleId);
    if (builtIn) {
        const permissionIds = await withAuthDatabase(async (db) => {
            const roleDoc = await db.collection('permission_sets').findOne({
                id: roleId,
                isBuiltIn: true,
                deprecated: { $ne: true },
            });
            return roleDoc?.permissionIds || [];
        });

        return {
            id: builtIn.id,
            name: builtIn.name,
            description: builtIn.description,
            dataAccess: builtIn.dataAccess,
            permissionIds,
            isBuiltIn: true,
            isCustom: false,
        };
    }

    // 2. Fall back to custom roles from database
    return withAuthDatabase(async (db) => {
        const customRole = await db.collection('permission_sets').findOne({
            id: roleId,
            isCustom: true
        });

        if (!customRole) return undefined;

        // Custom roles should have dataAccess defined in the database
        // If not, default to empty access (secure by default)
        const dataAccess: DataAccessConfig = customRole.dataAccess || {
            collections: [],
            fieldMasking: {},
        };

        return {
            id: customRole.id,
            name: customRole.name,
            description: customRole.description,
            dataAccess,
            permissionIds: customRole.permissionIds || [],
            isBuiltIn: false,
            isCustom: true,
        };
    });
}

/**
 * Check if a role can see a specific field (unmasked)
 * 
 * Replaces roleCanSeeField() from built-in-roles.ts
 * Works for both built-in and custom roles.
 * 
 * @param roleId - Role identifier
 * @param collection - Collection name
 * @param field - Field name
 * @returns True if field is visible (not masked)
 */
export async function canRoleSeeField(
    roleId: string,
    collection: string,
    field: string
): Promise<boolean> {
    const permissionSet = await getPermissionSetForRole(roleId);
    if (!permissionSet) return false;

    const fieldMasking = permissionSet.dataAccess.fieldMasking?.[collection];
    if (!fieldMasking) return true; // No masking rules = all visible

    const visibility = fieldMasking[field];
    if (visibility === undefined) return true; // No rule for field = visible

    return visibility;
}
