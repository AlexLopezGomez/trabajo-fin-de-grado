"use server";

/**
 * Dashboard Sharing Actions
 * Sharing rules, access control, and dashboard movement
 */

import { requireAuth } from "@/lib/auth/guards";
import { ok, fail, fromError } from "../admin/groups/response";
import type { ApiResponse } from "@/types/rbac";
import { error as logError } from "@/lib/utils/logger";
import {
    addSharingRuleSchema,
    updateSharingRuleSchema,
    removeSharingRuleSchema,
    updateSharingModeSchema,
    moveDashboardToSpaceSchema,
    shareTargetSearchSchema,
    objectIdSchema,
} from "./schemas";

import { getSpaceDetailService } from "@/lib/services/spaces/spaces.service";

import {
    updateSharingModeService,
    addSharingRuleService,
    updateSharingRuleService,
    removeSharingRuleService,
    moveDashboardToSpaceService,
    searchShareTargetsService,
    getDashboardSharingDetailsService,
} from "@/lib/services/dashboard/dashboard-sharing";

import {
    resolveDashboardAccess,
    checkDashboardPermission,
    getAccessibleDashboards,
    getDashboardWithSharing,
} from "@/lib/services/dashboard/dashboard-permission.service";

import type {
    DashboardWithSharing,
    DashboardSharingRule,
    DashboardSharingMode,
    DashboardPermission,
    SharingTargetType,
    ShareTargetSearchResult,
    ResolvedAccess,
    DashboardWithAccess,
} from "@/types/spaces";

// ============================================
// SHARING DETAILS
// ============================================

export async function getDashboardSharing(
    dashboardId: string
): Promise<ApiResponse<{
    dashboard: DashboardWithSharing;
    currentAccess: {
        id: string;
        name: string;
        type: SharingTargetType;
        permission: DashboardPermission;
        grantedBy?: string;
        grantedAt?: Date;
        expiresAt?: Date;
    }[];
    userAccess: ResolvedAccess;
}>> {
    try {
        const user = await requireAuth();
        const parsed = objectIdSchema.parse(dashboardId);
        const result = await getDashboardSharingDetailsService(parsed);
        if (!result) return fail("Dashboard not found");

        const userAccess = await resolveDashboardAccess(user.id, user.role, result.dashboard);
        if (!userAccess.hasAccess) return fail("You don't have access to this dashboard");

        return ok({ ...result, userAccess });
    } catch (error) {
        logError("Error fetching dashboard sharing:", error);
        return fromError(error, "Failed to fetch sharing details");
    }
}

// ============================================
// SHARING MODE & RULES
// ============================================

export async function updateDashboardSharingMode(
    dashboardId: string,
    mode: DashboardSharingMode,
    publicPermission?: DashboardPermission
): Promise<ApiResponse<{ dashboard: DashboardWithSharing }>> {
    try {
        const user = await requireAuth();
        const parsed = updateSharingModeSchema.parse({ dashboardId, mode, publicPermission });
        const dashboard = await getDashboardWithSharing(parsed.dashboardId);
        if (!dashboard) return fail("Dashboard not found");

        const hasPermission = await checkDashboardPermission(user.id, user.role, dashboard, "ADMIN");
        if (!hasPermission) return fail("You don't have permission to change sharing settings");

        const updatedDashboard = await updateSharingModeService(
            parsed.dashboardId, parsed.mode, parsed.publicPermission,
            { id: user.id, name: user.name || "Unknown", email: user.email }
        );
        return ok({ dashboard: updatedDashboard });
    } catch (error) {
        logError("Error updating sharing mode:", error);
        return fromError(error, "Failed to update sharing mode");
    }
}

export async function addDashboardSharingRule(
    dashboardId: string,
    type: SharingTargetType,
    targetId: string,
    permission: DashboardPermission,
    expiresAt?: Date,
    note?: string
): Promise<ApiResponse<{ rule: DashboardSharingRule }>> {
    try {
        const user = await requireAuth();
        const parsed = addSharingRuleSchema.parse({ dashboardId, type, targetId, permission, expiresAt, note });
        const dashboard = await getDashboardWithSharing(parsed.dashboardId);
        if (!dashboard) return fail("Dashboard not found");

        const hasPermission = await checkDashboardPermission(user.id, user.role, dashboard, "ADMIN");
        if (!hasPermission) return fail("You don't have permission to share this dashboard");

        const rule = await addSharingRuleService(parsed.dashboardId, {
            type: parsed.type, targetId: parsed.targetId, permission: parsed.permission,
            expiresAt: parsed.expiresAt, note: parsed.note,
        }, { id: user.id, name: user.name || "Unknown", email: user.email });
        return ok({ rule });
    } catch (error) {
        logError("Error adding sharing rule:", error);
        return fromError(error, "Failed to add sharing rule");
    }
}

export async function updateDashboardSharingRule(
    dashboardId: string,
    ruleId: string,
    updates: { permission?: DashboardPermission; expiresAt?: Date | null; note?: string }
): Promise<ApiResponse<{ rule: DashboardSharingRule }>> {
    try {
        const user = await requireAuth();
        const parsed = updateSharingRuleSchema.parse({ dashboardId, ruleId, ...updates });
        const dashboard = await getDashboardWithSharing(parsed.dashboardId);
        if (!dashboard) return fail("Dashboard not found");

        const hasPermission = await checkDashboardPermission(user.id, user.role, dashboard, "ADMIN");
        if (!hasPermission) return fail("You don't have permission to modify sharing");

        const rule = await updateSharingRuleService(parsed.dashboardId, parsed.ruleId, {
            permission: parsed.permission, expiresAt: parsed.expiresAt, note: parsed.note,
        }, { id: user.id, name: user.name || "Unknown", email: user.email });
        return ok({ rule });
    } catch (error) {
        logError("Error updating sharing rule:", error);
        return fromError(error, "Failed to update sharing rule");
    }
}

export async function removeDashboardSharingRule(
    dashboardId: string,
    ruleId: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
        const user = await requireAuth();
        const parsed = removeSharingRuleSchema.parse({ dashboardId, ruleId });
        const dashboard = await getDashboardWithSharing(parsed.dashboardId);
        if (!dashboard) return fail("Dashboard not found");

        const hasPermission = await checkDashboardPermission(user.id, user.role, dashboard, "ADMIN");
        if (!hasPermission) return fail("You don't have permission to modify sharing");

        const result = await removeSharingRuleService(parsed.dashboardId, parsed.ruleId, {
            id: user.id, name: user.name || "Unknown", email: user.email,
        });
        return ok(result);
    } catch (error) {
        logError("Error removing sharing rule:", error);
        return fromError(error, "Failed to remove sharing rule");
    }
}

// ============================================
// DASHBOARD MOVEMENT & SEARCH
// ============================================

export async function moveDashboardToSpace(
    dashboardId: string,
    spaceId: string | null
): Promise<ApiResponse<{ dashboard: DashboardWithSharing }>> {
    try {
        const user = await requireAuth();
        const parsed = moveDashboardToSpaceSchema.parse({ dashboardId, spaceId });
        const dashboard = await getDashboardWithSharing(parsed.dashboardId);
        if (!dashboard) return fail("Dashboard not found");

        const hasPermission = await checkDashboardPermission(user.id, user.role, dashboard, "ADMIN");
        if (!hasPermission) return fail("You don't have permission to move this dashboard");

        if (parsed.spaceId) {
            const space = await getSpaceDetailService(parsed.spaceId);
            if (!space) return fail("Space not found");
            const isMember = space.members.some((m) => m.userId === user.id);
            if (!isMember && user.role !== "admin") {
                return fail("You don't have access to the target space");
            }
        }

        const updatedDashboard = await moveDashboardToSpaceService(parsed.dashboardId, parsed.spaceId, {
            id: user.id, name: user.name || "Unknown", email: user.email,
        });
        return ok({ dashboard: updatedDashboard });
    } catch (error) {
        logError("Error moving dashboard:", error);
        return fromError(error, "Failed to move dashboard");
    }
}

export async function searchShareTargets(
    query: string,
    types?: SharingTargetType[],
    excludeIds?: string[],
    limit: number = 10
): Promise<ApiResponse<{ results: ShareTargetSearchResult[] }>> {
    try {
        await requireAuth();
        const parsed = shareTargetSearchSchema.parse({ query, types, excludeIds, limit });
        const results = await searchShareTargetsService(parsed.query, parsed.types, parsed.excludeIds, parsed.limit);
        return ok({ results });
    } catch (error) {
        logError("Error searching share targets:", error);
        return fromError(error, "Failed to search");
    }
}

// ============================================
// ACCESSIBLE DASHBOARDS
// ============================================

export async function getAccessibleDashboardsAction(
    filters?: {
        spaceId?: string | null;
        sharingMode?: string;
        permission?: "CAN_EDIT" | "VIEW_ONLY";
        showArchived?: boolean;
        showSharedWithMe?: boolean;
        showMyDashboards?: boolean;
        search?: string;
    },
    page: number = 1,
    pageSize: number = 20
): Promise<ApiResponse<{ dashboards: DashboardWithAccess[]; total: number }>> {
    try {
        const user = await requireAuth();
        const result = await getAccessibleDashboards(user.id, user.role, filters, { page, pageSize });
        return ok(result);
    } catch (error) {
        logError("Error fetching accessible dashboards:", error);
        return fromError(error, "Failed to fetch dashboards");
    }
}

export async function checkMyDashboardPermission(
    dashboardId: string,
    requiredPermission: DashboardPermission
): Promise<ApiResponse<{ hasPermission: boolean; access: ResolvedAccess }>> {
    try {
        const user = await requireAuth();
        const parsed = objectIdSchema.parse(dashboardId);
        const dashboard = await getDashboardWithSharing(parsed);
        if (!dashboard) {
            return ok({ hasPermission: false, access: { hasAccess: false, permission: null, sources: [], primarySource: null } });
        }

        const access = await resolveDashboardAccess(user.id, user.role, dashboard);
        const hasPermission = await checkDashboardPermission(user.id, user.role, dashboard, requiredPermission);
        return ok({ hasPermission, access });
    } catch (error) {
        logError("Error checking permission:", error);
        return fromError(error, "Failed to check permission");
    }
}
