'use server';

import { requireAuth } from '@/lib/auth/guards';
import { isBuiltInRole, BUILT_IN_ROLE_METADATA, BuiltInRoleId } from '@/lib/auth/rbac/built-in-roles';

/**
 * Get the human-readable name for a role (built-in only)
 * Accessible to all authenticated users
 */
export async function getRoleNameAndType(roleId: string): Promise<{ name: string; isCustom: boolean }> {
    await requireAuth();

    // Check built-in roles
    if (isBuiltInRole(roleId)) {
        const metadata = BUILT_IN_ROLE_METADATA[roleId as BuiltInRoleId];
        return { name: metadata.name, isCustom: false };
    }

    // Fallback for unknown roles
    return { name: roleId, isCustom: false };
}

