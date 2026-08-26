"use server";

import { logger } from "@/lib/utils/logger";
import type { Group, ApiResponse } from "@/types/rbac";
import { requireRole } from "@/lib/auth/guards";
import { groupIdParamSchema, paginationSchema } from "./schemas";
import { ok, fail, fromError } from "./response";
import {
    fetchGroups as svcFetchGroups,
    fetchGroupDetail as svcFetchGroupDetail,
} from "@/lib/services/groups.service";

/**
 * Get list of all groups (admin only)
 */
export async function getGroups(
    search?: string,
    page: number = 1,
    pageSize: number = 50
): Promise<ApiResponse<{ groups: Group[]; pagination: { page: number; pageSize: number; total: number } }>> {
    try {
        await requireRole(["admin"]);

        // Validate pagination
        const { page: _page, pageSize: _pageSize } = paginationSchema.parse({ page, pageSize });

        // Delegate to service
        const { groups, total } = await svcFetchGroups({ search, page: _page, pageSize: _pageSize });

        return ok({
            groups,
            pagination: {
                page: _page,
                pageSize: _pageSize,
                total,
            },
        });
    } catch (error) {
        logger.error("[ADMIN] Error fetching groups", error);
        return fromError(error, "Failed to fetch groups");
    }
}

/**
 * Get single group detail with members (admin only)
 */
export async function getGroupDetail(
    groupId: string
): Promise<ApiResponse<{ group: Group; memberCount: number; roleCount: number }>> {
    try {
        await requireRole(["admin"]);

        const parsedId = groupIdParamSchema.parse(groupId);

        // Delegate to service
        const detail = await svcFetchGroupDetail(parsedId);

        if (!detail) {
            return fail("Group not found");
        }
        const { group, memberCount, roleCount } = detail;
        return ok({ group, memberCount, roleCount });
    } catch (error) {
        logger.error("[ADMIN] Error fetching group detail", error, { groupId });
        return fromError(error, "Failed to fetch group detail");
    }
}
