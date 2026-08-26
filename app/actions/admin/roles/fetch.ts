"use server";

import { requireRole, requireAuth } from "@/lib/auth/guards";
import { getAuthDatabase } from "@/lib/db";
import { logger } from "@/lib/utils/logger";
import type { ApiResponse, PermissionSet } from "@/types/rbac";
import type { BuiltInRoleId } from "@/lib/auth/rbac/built-in-roles";
import { buildRoleDefinition } from "./definitions";
import { ROLE_DEFINITIONS, type RoleDefinition } from "./types";
import { roleIdSchema } from "./schemas";

const PERMISSION_SETS_TTL = 60_000; // 60 seconds
let permissionSetsCache: { data: PermissionSet[]; expiresAt: number } | null = null;

/**
 * Get all role definitions (admin only)
 * Returns processed role definitions for built-in roles
 */
export async function getRoles(): Promise<ApiResponse<{ roles: RoleDefinition[] }>> {
    try {
        await requireRole(["admin"]);

        // Build definitions for all built-in roles
        const roleIds: BuiltInRoleId[] = Object.keys(ROLE_DEFINITIONS) as BuiltInRoleId[];
        const roles = await Promise.all(
            roleIds.map(roleId => buildRoleDefinition(roleId))
        );

        return {
            success: true,
            data: { roles },
        };
    } catch (error) {
        logger.error("[ADMIN] Error fetching roles", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch roles",
        };
    }
}

/**
 * Get all permission sets (built-in only)
 * Returns the raw PermissionSet objects from the DB
 */
export async function getPermissionSets(): Promise<ApiResponse<{ roles: PermissionSet[] }>> {
    try {
        const user = await requireAuth();

        if (user.role !== "admin") {
            return {
                success: false,
                error: "Access denied. Admin privileges required.",
            };
        }

        const now = Date.now();
        if (permissionSetsCache && permissionSetsCache.expiresAt > now) {
            return { success: true, data: { roles: permissionSetsCache.data } };
        }

        const db = await getAuthDatabase();

        const allRoles = await db
            .collection("permission_sets")
            .find({
                isBuiltIn: true,
                deprecated: { $ne: true }
            })
            .sort({ createdAt: -1 })
            .toArray();

        const roles: PermissionSet[] = allRoles.map((role) => ({
            id: role.id,
            name: role.name,
            description: role.description,
            permissionIds: role.permissionIds || [],
            isCustom: false,
            isBuiltIn: true,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
            dataAccess: role.dataAccess,
        }));

        permissionSetsCache = { data: roles, expiresAt: now + PERMISSION_SETS_TTL };

        return {
            success: true,
            data: { roles },
        };
    } catch (error) {
        logger.error("[ROLES] Error fetching permission sets", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch roles",
        };
    }
}

/**
 * Get single role detail (admin only)
 * For built-in roles
 */
export async function getRoleDetail(
    roleId: string
): Promise<ApiResponse<{ role: RoleDefinition }>> {
    try {
        await requireRole(["admin"]);

        // Validate role ID (only built-in roles)
        if (!Object.keys(ROLE_DEFINITIONS).includes(roleId)) {
            return {
                success: false,
                error: `Invalid role: ${roleId}`,
            };
        }

        const role = await buildRoleDefinition(roleId as BuiltInRoleId);

        return {
            success: true,
            data: { role },
        };
    } catch (error) {
        logger.error("[ADMIN] Error fetching role detail", error, { roleId });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch role detail",
        };
    }
}

/**
 * Get a specific permission set by ID (built-in only)
 */
export async function getPermissionSet(
    roleId: string
): Promise<ApiResponse<{ role: PermissionSet }>> {
    try {
        const user = await requireAuth();

        if (user.role !== "admin") {
            return {
                success: false,
                error: "Access denied. Admin privileges required.",
            };
        }

        const parsedRoleId = roleIdSchema.parse(roleId);

        // Query database directly for built-in role
        const db = await getAuthDatabase();
        const roleDoc = await db.collection("permission_sets").findOne({
            id: parsedRoleId,
            isBuiltIn: true
        });

        if (!roleDoc) {
            return {
                success: false,
                error: "Role not found",
            };
        }

        const role: PermissionSet = {
            id: roleDoc.id,
            name: roleDoc.name,
            description: roleDoc.description,
            permissionIds: roleDoc.permissionIds || [],
            isCustom: false,
            isBuiltIn: true,
            createdAt: roleDoc.createdAt,
            updatedAt: roleDoc.updatedAt,
            dataAccess: roleDoc.dataAccess,
        };

        return {
            success: true,
            data: { role },
        };
    } catch (error) {
        logger.error("[ROLES] Error fetching permission set", error, { roleId });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch role",
        };
    }
}

/**
 * Get users with a specific role (admin only)
 */
export async function getUsersByRole(
    roleId: string,
    page: number = 1,
    pageSize: number = 20
): Promise<ApiResponse<{
    users: Array<{ id: string; name: string; email: string; source: "direct" | "inherited"; groupName?: string }>;
    total: number;
}>> {
    try {
        await requireRole(["admin"]);

        // Validate role ID
        if (!Object.keys(ROLE_DEFINITIONS).includes(roleId)) {
            return {
                success: false,
                error: `Invalid role: ${roleId}`,
            };
        }

        const db = await getAuthDatabase();
        const skip = (page - 1) * pageSize;

        // Get direct users with this role
        const directUsers = await db
            .collection("app_users")
            .find({ role: roleId })
            .skip(skip)
            .limit(pageSize)
            .toArray();

        const directUserResults = directUsers.map((u) => ({
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            source: "direct" as const,
        }));

        // Get groups with this role assignment
        const groupAssignments = await db
            .collection("role_assignments")
            .find({
                targetType: "group",
                permissionSetId: roleId
            })
            .toArray();

        // Get users from those groups
        const inheritedUserResults: Array<{ id: string; name: string; email: string; source: "inherited"; groupName: string }> = [];

        for (const assignment of groupAssignments) {
            const group = await db
                .collection("groups")
                .findOne({ _id: assignment.targetId, deleted: { $ne: true } });

            if (group && group.memberIds && group.memberIds.length > 0) {
                const { ObjectId } = await import("mongodb");
                const members = await db
                    .collection("app_users")
                    .find({ _id: { $in: group.memberIds.map((id: string) => new ObjectId(id)) } })
                    .toArray();

                for (const member of members) {
                    // Avoid duplicates (user might have direct role and be in a group)
                    if (!directUserResults.some(u => u.id === member._id.toString()) &&
                        !inheritedUserResults.some(u => u.id === member._id.toString())) {
                        inheritedUserResults.push({
                            id: member._id.toString(),
                            name: member.name,
                            email: member.email,
                            source: "inherited",
                            groupName: group.name,
                        });
                    }
                }
            }
        }

        // Combine and paginate
        const allUsers = [...directUserResults, ...inheritedUserResults];
        const total = allUsers.length;

        return {
            success: true,
            data: {
                users: allUsers.slice(0, pageSize),
                total,
            },
        };
    } catch (error) {
        logger.error("[ADMIN] Error fetching users by role", error, {
            roleId,
            page,
            pageSize,
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch users by role",
        };
    }
}
