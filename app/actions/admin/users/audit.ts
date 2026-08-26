"use server";

import { requireRole } from "@/lib/auth/guards";
import { logger } from "@/lib/utils/logger";
import { ok, fromError } from "../groups/response";
import { userIdSchema, userPaginationSchema } from "./schemas";
import type { ApiResponse, AuditLogResponse, AuditLogFilters } from "@/types/rbac";
import {
    fetchUserAuditLogsService,
    fetchAllAuditLogsService,
    exportAuditLogsService,
} from "@/lib/services/users.service";

/**
 * Get audit logs for a specific user (admin only)
 */
export async function getUserAuditLogs(
    userId: string,
    limit: number = 20
): Promise<ApiResponse<AuditLogResponse>> {
    try {
        await requireRole(["admin"]);
        const parsedUserId = userIdSchema.parse(userId);
        const parsedLimit = userPaginationSchema.shape.page.parse(limit);

        const result = await fetchUserAuditLogsService(parsedUserId, parsedLimit);
        return ok(result);
    } catch (error) {
        logger.error("[ADMIN] Error fetching audit logs", error, { userId });
        return fromError(error, "Failed to fetch audit logs");
    }
}

/**
 * Get all audit logs with filters (admin only)
 */
export async function getAllAuditLogs(
    filters?: AuditLogFilters,
    page: number = 1,
    pageSize: number = 50
): Promise<ApiResponse<AuditLogResponse>> {
    try {
        await requireRole(["admin"]);
        const { page: _page, pageSize: _pageSize } = userPaginationSchema.parse({ page, pageSize });

        const result = await fetchAllAuditLogsService(filters, { page: _page, pageSize: _pageSize });
        return ok(result);
    } catch (error) {
        logger.error("[ADMIN] Error fetching audit logs", error, { filters, page, pageSize });
        return fromError(error, "Failed to fetch audit logs");
    }
}

/**
 * Export audit logs to CSV format (admin only)
 */
export async function exportAuditLogsToCSV(
    filters?: AuditLogFilters
): Promise<ApiResponse<string>> {
    try {
        await requireRole(["admin"]);
        const csv = await exportAuditLogsService(filters);
        return ok(csv);
    } catch (error) {
        logger.error("[ADMIN] Error exporting audit logs", error);
        return fromError(error, "Failed to export audit logs");
    }
}
