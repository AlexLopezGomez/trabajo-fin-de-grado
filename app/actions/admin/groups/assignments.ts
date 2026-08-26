"use server";

import { logger } from "@/lib/utils/logger";
import { logSecurityEvent } from "@/lib/monitoring/security-events";
import type { ApiResponse, RoleAssignment, Scope } from "@/types/rbac";
import { requireAdmin } from "@/lib/auth/guards";
import { groupIdParamSchema, assignRoleToGroupSchema, roleAssignmentIdSchema } from "./schemas";
import { ok, fromError } from "./response";
import {
    getGroupRoleAssignmentsService as svcGetGroupRoleAssignments,
    assignRoleToGroupService as svcAssignRoleToGroup,
    revokeRoleFromGroupService as svcRevokeRoleFromGroup,
} from "@/lib/services/groups.service";

/**
 * Get all role assignments for a group (admin only)
 */
export async function getGroupRoleAssignments(
    groupId: string
): Promise<ApiResponse<{ assignments: RoleAssignment[] }>> {
    try {
        await requireAdmin();
        const parsedId = groupIdParamSchema.parse(groupId);
        const assignments = await svcGetGroupRoleAssignments(parsedId);
        return ok({ assignments });
    } catch (error) {
        logger.error("[ADMIN] Error fetching group role assignments", error, { groupId });
        return fromError(error, "Failed to fetch group role assignments");
    }
}

/**
 * Assign a role to a group (admin only)
 * All members of this group will inherit this role
 * Uses MongoDB transaction for atomicity: role assignment + audit log
 *
 * SECURITY: Requires admin authentication and logs security events
 */
export async function assignRoleToGroup(
    groupId: string,
    permissionSetId: string,
    scope: Scope
): Promise<ApiResponse<{ assignment: RoleAssignment; message: string }>> {
    try {
        const admin = await requireAdmin();

        // Validate input
        const parsed = assignRoleToGroupSchema.parse({ groupId, permissionSetId, scope });

        // Delegate to service
        const assignment = await svcAssignRoleToGroup(
            parsed.groupId,
            parsed.permissionSetId,
            parsed.scope,
            { id: admin.id, email: admin.email, name: admin.name }
        );

        await logSecurityEvent({
            type: 'ADMIN_ACTION',
            severity: 'HIGH',
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            details: {
                action: 'ASSIGN_ROLE_TO_GROUP',
                groupId: parsed.groupId,
                permissionSetId: parsed.permissionSetId,
                scopeType: scope.type,
            },
        });

        logger.info('[ADMIN] Role assigned to group', {
            permissionSetId,
            groupId,
            scopeType: scope.type,
            adminEmail: admin.email,
            adminId: admin.id,
        });

        return ok({
            assignment,
            message: `Role "${permissionSetId}" assigned successfully with ${scope.type} scope`,
        });
    } catch (error) {
        logger.error("[ADMIN] Error assigning role to group", error, { groupId, permissionSetId });
        return fromError(error, "Failed to assign role to group");
    }
}

/**
 * Revoke a role from a group (admin only)
 * Removes the role assignment; members will no longer inherit this role
 * Uses MongoDB transaction for atomicity: role revocation + audit log
 *
 * SECURITY: Requires admin authentication and logs security events
 */
export async function revokeRoleFromGroup(
    groupId: string,
    roleAssignmentId: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
        const admin = await requireAdmin();

        // Validate input
        const parsedGroupId = groupIdParamSchema.parse(groupId);
        const parsedAssignmentId = roleAssignmentIdSchema.parse(roleAssignmentId);

        // Delegate to service
        const result = await svcRevokeRoleFromGroup(
            parsedGroupId,
            parsedAssignmentId,
            { id: admin.id, email: admin.email, name: admin.name }
        );

        await logSecurityEvent({
            type: 'ADMIN_ACTION',
            severity: 'HIGH',
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            details: {
                action: 'REVOKE_ROLE_FROM_GROUP',
                groupId: parsedGroupId,
                roleAssignmentId: parsedAssignmentId,
            },
        });

        logger.info('[ADMIN] Role assignment revoked', {
            roleAssignmentId,
            groupId,
            adminEmail: admin.email,
            adminId: admin.id,
        });

        return ok(result);
    } catch (error) {
        logger.error("[ADMIN] Error revoking role from group", error, { groupId, roleAssignmentId });
        return fromError(error, "Failed to revoke role from group");
    }
}
