"use server";

import { requireRole } from "@/lib/auth/guards";
import { logger } from "@/lib/utils/logger";
import { ok, fail, fromError } from "../groups/response";
import { userIdSchema } from "./schemas";
import type { ApiResponse } from "@/types/rbac";
import {
    getUserGroupsService,
    getEffectivePermissionsService,
    fetchUserDetailService,
} from "@/lib/services/users.service";
import { getBuiltInPermissionSet, getAvailableCollections } from "@/lib/auth/rbac/built-in-roles";

export interface ComputedAccessInfo {
    totalCollections: number;
    directRoleCount: number;
    inheritedRoleCount: number;
    groupCount: number;
    collections: Array<{
        name: string;
        canAccess: boolean;
        sources: Array<{ type: "direct" | "inherited"; roleName: string; groupName?: string }>;
    }>;
    fieldVisibility: Array<{
        collection: string;
        field: string;
        visible: boolean;
        maskedAs?: string;
    }>;
    rowLevelFilters: string;
    rawPermissions: {
        userId: string;
        directRoles: Array<{ permissionSetId: string; targetId: string; targetType: string }>;
        inheritedRoles: Array<{ permissionSetId: string; targetId: string; targetType: string }>;
        computedAt: Date;
    };
}

/**
 * Get user's groups and inherited roles (admin only)
 */
export async function getUserGroupsForUser(
    userId: string
): Promise<ApiResponse<Array<{
    groupId: string;
    groupName: string;
    roles: Array<{ permissionSetId: string; scope: { type: string; resourceId?: string } }>;
}>>> {
    try {
        await requireRole(["admin"]);
        const parsedUserId = userIdSchema.parse(userId);
        const groups = await getUserGroupsService(parsedUserId);
        return ok(groups);
    } catch (error) {
        logger.error("[ADMIN] Error fetching user groups", error);
        return fromError(error, "Failed to fetch user groups");
    }
}

/**
 * Get effective permissions for a user (admin only)
 */
export async function getEffectivePermissionsForUser(
    userId: string
): Promise<ApiResponse<ComputedAccessInfo>> {
    try {
        await requireRole(["admin"]);
        const parsedId = userIdSchema.parse(userId);

        const user = await fetchUserDetailService(parsedId);
        if (!user) return fail("User not found");

        const effectivePermissions = await getEffectivePermissionsService(parsedId);
        const userGroups = await getUserGroupsService(parsedId);

        // Build collection access map
        const allCollections = await getAvailableCollections();
        const collectionAccessMap = new Map<string, {
            canAccess: boolean;
            sources: Array<{ type: "direct" | "inherited"; roleName: string; groupName?: string }>;
        }>();

        allCollections.forEach(c => collectionAccessMap.set(c, { canAccess: false, sources: [] }));

        // Helper to get collections for a role
        const getCollectionsForRole = async (roleId: string): Promise<string[]> => {
            const set = await getBuiltInPermissionSet(roleId);
            if (!set) return [];
            if (set.dataAccess.collections === '*') return await getAvailableCollections();
            return set.dataAccess.collections;
        };

        // Check direct role
        if (user.role) {
            const cols = await getCollectionsForRole(user.role);
            cols.forEach(col => {
                const entry = collectionAccessMap.get(col);
                if (entry) {
                    entry.canAccess = true;
                    entry.sources.push({ type: "direct", roleName: user.role });
                }
            });
        }

        // Check inherited roles
        const groupNameMap = new Map(userGroups.map(g => [g.groupId, g.groupName]));
        for (const role of effectivePermissions.inheritedRoles) {
            const cols = await getCollectionsForRole(role.permissionSetId);
            const groupName = groupNameMap.get(role.targetId) || "Unknown";
            cols.forEach(col => {
                const entry = collectionAccessMap.get(col);
                if (entry) {
                    entry.canAccess = true;
                    entry.sources.push({ type: "inherited", roleName: role.permissionSetId, groupName });
                }
            });
        }

        // Build field visibility
        const fieldVisibility: ComputedAccessInfo["fieldVisibility"] = [];
        const effectiveRole = user.role || "viewer";
        const permSet = await getBuiltInPermissionSet(effectiveRole);
        if (permSet?.dataAccess.fieldMasking) {
            for (const [collection, fields] of Object.entries(permSet.dataAccess.fieldMasking)) {
                for (const [field, visible] of Object.entries(fields)) {
                    fieldVisibility.push({
                        collection,
                        field,
                        visible,
                        maskedAs: visible ? undefined : "[REDACTED]",
                    });
                }
            }
        }

        // Row-level filters description
        let rowLevelFilters = "None - sees all data globally";
        if (effectiveRole === "sales" && user.country) {
            rowLevelFilters = `Country-based filtering: Only sees data where country = "${user.country}"`;
        } else if (effectiveRole === "viewer") {
            rowLevelFilters = "Limited to public data only";
        }

        const collections = allCollections.map(name => ({
            name,
            ...(collectionAccessMap.get(name) || { canAccess: false, sources: [] }),
        }));

        return ok({
            totalCollections: collections.filter(c => c.canAccess).length,
            directRoleCount: effectivePermissions.directRoles.length + (user.role ? 1 : 0),
            inheritedRoleCount: effectivePermissions.inheritedRoles.length,
            groupCount: userGroups.length,
            collections,
            fieldVisibility,
            rowLevelFilters,
            rawPermissions: {
                ...effectivePermissions,
                effectiveRoles: undefined,
            } as ComputedAccessInfo["rawPermissions"],
        });
    } catch (error) {
        logger.error("[ADMIN] Error getting effective permissions", error);
        return fromError(error, "Failed to get effective permissions");
    }
}
