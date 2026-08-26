"use server";

import { logger } from "@/lib/utils/logger";
import { logSecurityEvent } from "@/lib/monitoring/security-events";
import type { ApiResponse } from "@/types/rbac";
import { requireAdmin } from "@/lib/auth/guards";
import { groupIdParamSchema, modifyMembersSchema } from "./schemas";
import { ok, fail, fromError } from "./response";
import {
    fetchGroupMembers as svcFetchGroupMembers,
    addUsersToGroupService as svcAddUsersToGroup,
    removeUsersFromGroupService as svcRemoveUsersFromGroup,
} from "@/lib/services/groups.service";

/**
 * Get group members with user details (admin only)
 */
export async function getGroupMembers(
    groupId: string,
    page: number = 1,
    pageSize: number = 50
): Promise<
    ApiResponse<{
        members: Array<{
            id: string;
            name: string;
            email: string;
            role: string;
        }>;
        pagination: { page: number; pageSize: number; total: number };
    }>
> {
    try {
        await requireAdmin();

        const parsedId = groupIdParamSchema.parse(groupId);
        // Delegate to service
        const result = await svcFetchGroupMembers(parsedId, page, pageSize);
        if (!result) {
            return fail("Group not found");
        }
        const { members, total } = result;
        return ok({ members, pagination: { page, pageSize, total } });
    } catch (error) {
        logger.error("[ADMIN] Error fetching group members", error, { groupId });
        return fromError(error, "Failed to fetch group members");
    }
}

/**
 * Add users to group (admin only)
 * Uses MongoDB transaction: update group + update users + audit log
 *
 * SECURITY: Requires admin authentication and logs security events
 */
export async function addUsersToGroup(
    groupId: string,
    userIds: string[]
): Promise<ApiResponse<{ added: number; message: string }>> {
    try {
        const admin = await requireAdmin();
        const parsed = modifyMembersSchema.parse({ groupId, userIds });
        const result = await svcAddUsersToGroup(parsed.groupId, parsed.userIds, { id: admin.id, email: admin.email, name: admin.name });

        await logSecurityEvent({
            type: 'ADMIN_ACTION',
            severity: 'MEDIUM',
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            details: {
                action: 'ADD_USERS_TO_GROUP',
                groupId: parsed.groupId,
                userIds: parsed.userIds,
                added: result.added,
            },
        });

        return ok(result);
    } catch (error) {
        logger.error("[ADMIN] Error adding users to group", error, { groupId });
        return fromError(error, "Failed to add users to group");
    }
}

/**
 * Remove users from group (admin only)
 * Uses MongoDB transaction: update group + update users + audit log
 *
 * SECURITY: Requires admin authentication and logs security events
 */
export async function removeUsersFromGroup(
    groupId: string,
    userIds: string[]
): Promise<ApiResponse<{ removed: number; message: string }>> {
    try {
        const admin = await requireAdmin();
        const parsed = modifyMembersSchema.parse({ groupId, userIds });
        const result = await svcRemoveUsersFromGroup(parsed.groupId, parsed.userIds, { id: admin.id, email: admin.email, name: admin.name });

        await logSecurityEvent({
            type: 'ADMIN_ACTION',
            severity: 'MEDIUM',
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            details: {
                action: 'REMOVE_USERS_FROM_GROUP',
                groupId: parsed.groupId,
                userIds: parsed.userIds,
                removed: result.removed,
            },
        });

        return ok(result);
    } catch (error) {
        logger.error("[ADMIN] Error removing users from group", error, { groupId });
        return fromError(error, "Failed to remove users from group");
    }
}
