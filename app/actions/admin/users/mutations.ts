"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { logger } from "@/lib/utils/logger";
import { logSecurityEvent } from "@/lib/monitoring/security-events";
import { ok, fail, fromError } from "../groups/response";
import { deleteUserSchema } from "./schemas";
import type { ApiResponse } from "@/types/rbac";
import {
    updateUserRoleService,
    deleteUserService,
    type AdminActor,
} from "@/lib/services/users.service";

/**
 * Update user role (admin only)
 *
 * SECURITY: Requires admin authentication and logs security events
 */
export async function updateUserRole(
    userId: string,
    newRole: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
        const admin = await requireAdmin();

        // Validate role
        const { getPermissionSets } = await import("@/app/actions/admin/roles/index");
        const result = await getPermissionSets();
        if (!result.success || !result.data) return fail("Failed to validate role");

        const validRoles = result.data.roles.map(r => r.id);
        if (!validRoles.includes(newRole)) {
            return fail(`Invalid role: ${newRole}. Valid roles: ${validRoles.join(", ")}`);
        }

        if (admin.id === userId) {
            return fail("You cannot change your own role. Ask another admin to do it.");
        }

        const adminActor: AdminActor = { id: admin.id, email: admin.email, name: admin.name };
        const { oldRole } = await updateUserRoleService(userId, newRole, adminActor);

        await logSecurityEvent({
            type: 'ADMIN_ACTION',
            severity: 'HIGH',
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            details: {
                action: 'UPDATE_USER_ROLE',
                targetUserId: userId,
                oldRole,
                newRole,
            },
        });

        return ok({ success: true, message: `Role updated from ${oldRole} to ${newRole}` });
    } catch (error) {
        logger.error("[ADMIN] Error updating user role", error, { userId, newRole });
        return fromError(error, "Failed to update user role");
    }
}

/**
 * Delete a user (soft delete)
 *
 * SECURITY: Requires admin authentication and logs security events
 */
export async function deleteUser(
    input: { userId: string; reason?: string }
): Promise<ApiResponse<void>> {
    try {
        const admin = await requireAdmin();
        const parsed = deleteUserSchema.parse(input);

        if (admin.id === parsed.userId) {
            return fail("You cannot delete your own account.");
        }

        const adminActor: AdminActor = { id: admin.id, email: admin.email, name: admin.name };
        await deleteUserService(parsed.userId, parsed.reason, adminActor);

        await logSecurityEvent({
            type: 'ADMIN_ACTION',
            severity: 'CRITICAL',
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            details: {
                action: 'DELETE_USER',
                targetUserId: parsed.userId,
                reason: parsed.reason,
            },
        });

        return ok(undefined);
    } catch (error) {
        logger.error("[ADMIN] Error deleting user", error);
        return fromError(error, "Failed to delete user");
    }
}
