"use server";

import { requireRole } from "@/lib/auth/guards";
import { logActionWithContext } from "@/lib/auth/guards";
import { logger } from "@/lib/utils/logger";
import { ok, fail, fromError } from "../groups/response";
import { userIdSchema, userFiltersSchema, userPaginationSchema } from "./schemas";
import type { ApiResponse, UserListResponse, UserListFilters, UserDetailResponse } from "@/types/rbac";
import {
    fetchUsersService,
    fetchUserDetailService,
    fetchGroupsForFilterService,
} from "@/lib/services/users.service";

/**
 * Get list of all users (admin only)
 */
export async function getUsers(
    filters?: UserListFilters,
    page: number = 1,
    pageSize: number = 50
): Promise<ApiResponse<UserListResponse>> {
    try {
        await requireRole(["admin"]);
        const { page: _page, pageSize: _pageSize } = userPaginationSchema.parse({ page, pageSize });
        const parsedFilters = userFiltersSchema.parse(filters);

        // Validate role if provided
        if (parsedFilters?.role) {
            const { getPermissionSets } = await import("@/app/actions/admin/roles/index");
            const result = await getPermissionSets();
            if (result.success && result.data) {
                const validRoles = result.data.roles.map(r => r.id);
                if (!validRoles.includes(parsedFilters.role)) {
                    return fail("Invalid role filter");
                }
            }
        }

        const result = await fetchUsersService(parsedFilters, { page: _page, pageSize: _pageSize });
        return ok(result);
    } catch (error) {
        logger.error("[ADMIN] Error fetching users", error);
        return fromError(error, "Failed to fetch users");
    }
}

/**
 * Get single user detail (admin only)
 */
export async function getUserDetail(userId: string): Promise<ApiResponse<UserDetailResponse>> {
    try {
        await requireRole(["admin"]);
        const parsedUserId = userIdSchema.parse(userId);

        const user = await fetchUserDetailService(parsedUserId);
        if (!user) {
            logActionWithContext('user_detail_failed', { targetUserId: parsedUserId, reason: 'user_not_found' });
            return fail("User not found");
        }

        logActionWithContext('user_detail_viewed', {
            targetUserId: parsedUserId,
            targetEmail: user.email,
            targetRole: user.role,
        });

        return ok({ user });
    } catch (error) {
        logger.error("[ADMIN] Error fetching user detail", error, { userId });
        return fromError(error, "Failed to fetch user detail");
    }
}


/**
 * Get groups for filter dropdown (admin only)
 */
export async function getGroupsForFilter(): Promise<ApiResponse<{ id: string; name: string; memberCount: number }[]>> {
    try {
        await requireRole(["admin"]);
        const groups = await fetchGroupsForFilterService();
        return ok(groups);
    } catch (error) {
        logger.error("[ADMIN] Error fetching groups for filter", error);
        return fromError(error, "Failed to fetch groups");
    }
}
