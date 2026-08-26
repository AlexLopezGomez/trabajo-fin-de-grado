"use server";

import { logger } from "@/lib/utils/logger";
import type { ApiResponse, AuditLogResponse } from "@/types/rbac";
import { requireRole } from "@/lib/auth/guards";
import { groupIdParamSchema } from "./schemas";
import { ok, fromError } from "./response";
import {
    fetchGroupAuditLogsService as svcFetchGroupAuditLogs,
} from "@/lib/services/groups.service";

/**
 * Get audit logs for a specific group (admin only)
 */
export async function getGroupAuditLogs(
    groupId: string,
    limit: number = 20
): Promise<ApiResponse<AuditLogResponse>> {
    try {
        await requireRole(["admin"]);
        const parsedId = groupIdParamSchema.parse(groupId);
        const result = await svcFetchGroupAuditLogs(parsedId, limit);
        return ok({ logs: result.logs, total: result.total, hasMore: result.hasMore });
    } catch (error) {
        logger.error("[ADMIN] Error fetching group audit logs", error, { groupId });
        return fromError(error, "Failed to fetch group audit logs");
    }
}
