

import { getBuiltInPermissionSet, getAvailableCollections, type BuiltInRoleId } from "@/lib/auth/rbac/built-in-roles";
import { type RoleDefinition, ROLE_DEFINITIONS } from "./types";

/**
 * Build field masking info for a role from permission set
 */
export async function buildFieldMaskingInfo(roleId: string): Promise<RoleDefinition["fieldMasking"]> {
    const result: RoleDefinition["fieldMasking"] = [];

    const permissionSet = await getBuiltInPermissionSet(roleId);
    if (!permissionSet?.dataAccess.fieldMasking) {
        return result;
    }

    for (const [collection, fields] of Object.entries(permissionSet.dataAccess.fieldMasking)) {
        for (const [field, visible] of Object.entries(fields)) {
            result.push({
                collection,
                field,
                canAccess: visible,
            });
        }
    }

    return result;
}

/**
 * Build complete role definition from permission set
 */
export async function buildRoleDefinition(roleId: BuiltInRoleId): Promise<RoleDefinition> {
    const base = ROLE_DEFINITIONS[roleId];
    const permissionSet = await getBuiltInPermissionSet(roleId);

    // Get collections from permission set
    let collections: string[] = [];
    if (permissionSet) {
        const { collections: roleCollections } = permissionSet.dataAccess;
        if (roleCollections === '*') {
            // Admin wildcard - get all available collections
            collections = await getAvailableCollections();
        } else {
            collections = roleCollections;
        }
    }

    return {
        id: roleId,
        ...base,
        collections,
        fieldMasking: await buildFieldMaskingInfo(roleId),
    };
}
