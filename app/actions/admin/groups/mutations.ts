"use server";

import { logger } from "@/lib/utils/logger";
import { logSecurityEvent } from "@/lib/monitoring/security-events";
import type { Group, ApiResponse } from "@/types/rbac";
import { requireAdmin } from "@/lib/auth/guards";
import { z } from "zod";
import { groupIdParamSchema, updateGroupSchema } from "./schemas";
import { ok, fromError } from "./response";
import {
    createGroupService as svcCreateGroup,
    updateGroupService as svcUpdateGroup,
    deleteGroupService as svcDeleteGroup,
} from "@/lib/services/groups.service";

/**
 * Create a new group (admin only)
 * Uses MongoDB transaction for atomicity: group creation + audit log
 *
 * SECURITY: Requires admin authentication and logs security events
 */
export async function createGroup(
    name: string,
    description: string = ""
): Promise<ApiResponse<{ group: Group }>> {
    try {
        const admin = await requireAdmin();

        // Validate input
        const createSchema = z.object({
            name: z.string().trim().min(1).max(100),
            description: z.string().trim().max(500).optional(),
        });
        const parsed = createSchema.parse({ name, description });

        // Delegate to service
        const group = await svcCreateGroup(parsed.name, parsed.description, {
            id: admin.id,
            email: admin.email,
            name: admin.name,
        });

        await logSecurityEvent({
            type: 'ADMIN_ACTION',
            severity: 'MEDIUM',
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            details: {
                action: 'CREATE_GROUP',
                groupId: group.id,
                groupName: group.name,
            },
        });

        return ok({ group });
    } catch (error) {
        logger.error("[ADMIN] Error creating group", error, { groupName: name });
        return {
            success: false,
            error:
                error instanceof Error ? error.message : "Failed to create group",
        };
    }
}

/**
 * Update group (name/description) (admin only)
 *
 * SECURITY: Requires admin authentication and logs security events
 */
export async function updateGroup(
    groupId: string,
    updates: { name?: string; description?: string }
): Promise<ApiResponse<{ group: Group }>> {
    try {
        const admin = await requireAdmin();
        const parsedId = groupIdParamSchema.parse(groupId);
        const parsedUpdates = updateGroupSchema.parse(updates);
        const group = await svcUpdateGroup(parsedId, parsedUpdates, { id: admin.id, email: admin.email, name: admin.name });

        await logSecurityEvent({
            type: 'ADMIN_ACTION',
            severity: 'MEDIUM',
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            details: {
                action: 'UPDATE_GROUP',
                groupId: parsedId,
                groupName: group.name,
                updates: parsedUpdates,
            },
        });

        return ok({ group });
    } catch (error) {
        logger.error("[ADMIN] Error updating group", error, { groupId });
        return fromError(error, "Failed to update group");
    }
}

/**
 * Delete group (admin only)
 * Soft delete: marks as deleted but preserves data for audit trail
 *
 * SECURITY: Requires admin authentication and logs security events
 */
export async function deleteGroup(
    groupId: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
        const admin = await requireAdmin();
        const parsedId = groupIdParamSchema.parse(groupId);
        const result = await svcDeleteGroup(parsedId, { id: admin.id, email: admin.email, name: admin.name });

        await logSecurityEvent({
            type: 'ADMIN_ACTION',
            severity: 'HIGH',
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            details: {
                action: 'DELETE_GROUP',
                groupId: parsedId,
            },
        });

        return ok(result);
    } catch (error) {
        logger.error("[ADMIN] Error deleting group", error, { groupId });
        return fromError(error, "Failed to delete group");
    }
}
