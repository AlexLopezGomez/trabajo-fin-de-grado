"use server";

import { requireRole, requireAuth } from "@/lib/auth/guards";
import { getAuthDatabase } from "@/lib/db";
import { logger } from "@/lib/utils/logger";
import type { UserRole } from "@/auth";
import type { ApiResponse } from "@/types/rbac";
import { roleIdSchema } from "./schemas";
import { ROLE_DEFINITIONS, type RoleUsage } from "./types";

/**
 * Get role usage statistics for all roles (admin only)
 * Aggregates across users and groups
 */
export async function getRoleUsageStats(): Promise<ApiResponse<{ usage: RoleUsage[] }>> {
    try {
        await requireRole(["admin"]);

        const db = await getAuthDatabase();

        // Get direct user counts per role
        const userRoleCounts = await db
            .collection("app_users")
            .aggregate([
                { $match: { role: { $exists: true } } },
                { $group: { _id: "$role", count: { $sum: 1 } } },
            ])
            .toArray();

        const userCountMap = new Map<string, number>();
        userRoleCounts.forEach((r) => {
            userCountMap.set(r._id, r.count);
        });

        // Get group role assignment counts
        const groupRoleCounts = await db
            .collection("role_assignments")
            .aggregate([
                { $match: { targetType: "group" } },
                { $group: { _id: "$permissionSetId", count: { $sum: 1 } } },
            ])
            .toArray();

        const groupCountMap = new Map<string, number>();
        groupRoleCounts.forEach((r) => {
            groupCountMap.set(r._id, r.count);
        });

        // Calculate inherited user counts
        const inheritedCounts = new Map<string, number>();

        const groupAssignments = await db
            .collection("role_assignments")
            .find({ targetType: "group" })
            .toArray();

        for (const assignment of groupAssignments) {
            const group = await db
                .collection("groups")
                .findOne({ _id: assignment.targetId, deleted: { $ne: true } });

            if (group && group.memberIds) {
                const roleId = assignment.permissionSetId;
                const currentCount = inheritedCounts.get(roleId) || 0;
                inheritedCounts.set(roleId, currentCount + group.memberIds.length);
            }
        }

        // Build usage array for all BUILT-IN roles
        const usage: RoleUsage[] = Object.keys(ROLE_DEFINITIONS).map((roleId) => ({
            roleId: roleId as UserRole,
            directUserCount: userCountMap.get(roleId) || 0,
            groupCount: groupCountMap.get(roleId) || 0,
            inheritedUserCount: inheritedCounts.get(roleId) || 0,
        }));

        return {
            success: true,
            data: { usage },
        };
    } catch (error) {
        logger.error("[ADMIN] Error fetching role usage stats", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch role usage statistics",
        };
    }
}

/**
 * Get role usage statistics for a single role
 */
export async function getRoleUsage(
    roleId: string
): Promise<ApiResponse<{ userCount: number; groupCount: number }>> {
    try {
        const user = await requireAuth();

        if (user.role !== "admin") {
            return {
                success: false,
                error: "Access denied. Admin privileges required.",
            };
        }

        const parsedRoleId = roleIdSchema.parse(roleId);
        const db = await getAuthDatabase();

        // Count direct users with this role
        const userCount = await db
            .collection("app_users")
            .countDocuments({ role: parsedRoleId });

        // Count groups with this role assigned
        const groupCount = await db
            .collection("role_assignments")
            .countDocuments({
                permissionSetId: parsedRoleId,
                targetType: "group"
            });

        return {
            success: true,
            data: { userCount, groupCount },
        };
    } catch (error) {
        logger.error("[ROLES] Error fetching role usage", error, { roleId });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch role usage",
        };
    }
}

