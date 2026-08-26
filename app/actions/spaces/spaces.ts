"use server";

/**
 * Space Management Actions
 * CRUD operations for spaces and space membership
 */

import { requireAuth, requireRole } from "@/lib/auth/guards";
import { ok, fail, fromError } from "../admin/groups/response";
import type { ApiResponse } from "@/types/rbac";
import { error as logError } from "@/lib/utils/logger";
import {
    createSpaceSchema,
    updateSpaceSchema,
    addSpaceMemberSchema,
    updateSpaceMemberSchema,
    removeSpaceMemberSchema,
    paginationSchema,
    spaceFiltersSchema,
    objectIdSchema,
} from "./schemas";

import {
    createSpaceService,
    getSpacesService,
    getUserSpacesService,
    getSpaceDetailService,
    updateSpaceService,
    addSpaceMemberService,
    updateSpaceMemberService,
    removeSpaceMemberService,
    addSpaceGroupAccessService,
    removeSpaceGroupAccessService,
    deleteSpaceService,
} from "@/lib/services/spaces/spaces.service";

import { getAccessibleDashboards } from "@/lib/services/dashboard/dashboard-permission.service";

import type {
    Space,
    SpaceSummary,
    CreateSpaceInput,
    UpdateSpaceInput,
    DashboardWithAccess,
    SpaceType,
} from "@/types/spaces";

// ============================================
// SPACE CRUD
// ============================================

export async function createSpace(
    input: CreateSpaceInput
): Promise<ApiResponse<{ space: Space }>> {
    try {
        const user = await requireAuth();
        const parsed = createSpaceSchema.parse(input);
        const space = await createSpaceService(parsed, {
            id: user.id,
            name: user.name || "Unknown",
            email: user.email,
        });
        return ok({ space });
    } catch (error) {
        logError("Error creating space:", error);
        return fromError(error, "Failed to create space");
    }
}

export async function getSpaces(
    filters?: { search?: string; type?: string; showArchived?: boolean },
    page: number = 1,
    pageSize: number = 20
): Promise<ApiResponse<{ spaces: SpaceSummary[]; total: number }>> {
    try {
        await requireRole(["admin"]);
        const parsedPagination = paginationSchema.parse({ page, pageSize });
        const parsedFilters = spaceFiltersSchema.parse(filters);
        const result = await getSpacesService(parsedFilters, parsedPagination);
        return ok(result);
    } catch (error) {
        logError("Error fetching spaces:", error);
        return fromError(error, "Failed to fetch spaces");
    }
}

export async function getMySpaces(
    filters?: { search?: string; type?: SpaceType }
): Promise<ApiResponse<{ spaces: SpaceSummary[] }>> {
    try {
        const user = await requireAuth();
        const spaces = await getUserSpacesService(user.id, filters);
        return ok({ spaces });
    } catch (error) {
        logError("Error fetching user spaces:", error);
        return fromError(error, "Failed to fetch your spaces");
    }
}

export async function getSpaceDetail(
    spaceId: string
): Promise<ApiResponse<{ space: Space }>> {
    try {
        const user = await requireAuth();
        const parsed = objectIdSchema.parse(spaceId);
        const space = await getSpaceDetailService(parsed);
        if (!space) return fail("Space not found");

        const isMember = space.members.some((m) => m.userId === user.id);
        if (!isMember && user.role !== "admin") {
            return fail("You don't have access to this space");
        }
        return ok({ space });
    } catch (error) {
        logError("Error fetching space detail:", error);
        return fromError(error, "Failed to fetch space detail");
    }
}

export async function getSpaceDashboards(
    spaceId: string
): Promise<ApiResponse<{ dashboards: DashboardWithAccess[] }>> {
    try {
        const user = await requireAuth();
        const spaceResult = await getSpaceDetail(spaceId);
        if (!spaceResult.success) return fail(spaceResult.error || "Space not found");

        const allDashboards = await getAccessibleDashboards(user.id, user.role, {}, { page: 1, pageSize: 1000 });
        const spaceDashboards = allDashboards.dashboards.filter((dashboard) => {
            if (dashboard.spaceId === spaceId) return true;
            if (dashboard.sharing?.rules) {
                return dashboard.sharing.rules.some(
                    (rule) => rule.type === "SPACE" && rule.targetId === spaceId &&
                        (!rule.expiresAt || new Date(rule.expiresAt) > new Date())
                );
            }
            return false;
        });
        return ok({ dashboards: spaceDashboards });
    } catch (error) {
        logError("Error fetching space dashboards:", error);
        return fromError(error, "Failed to fetch space dashboards");
    }
}

export async function updateSpace(
    spaceId: string,
    input: UpdateSpaceInput
): Promise<ApiResponse<{ space: Space }>> {
    try {
        const user = await requireAuth();
        const parsedId = objectIdSchema.parse(spaceId);
        const parsedInput = updateSpaceSchema.parse(input);

        const space = await getSpaceDetailService(parsedId);
        if (!space) return fail("Space not found");

        const memberRole = space.members.find((m) => m.userId === user.id)?.role;
        if (memberRole !== "ADMIN" && user.role !== "admin") {
            return fail("You don't have permission to update this space");
        }

        const updatedSpace = await updateSpaceService(parsedId, parsedInput, {
            id: user.id, name: user.name || "Unknown", email: user.email,
        });
        return ok({ space: updatedSpace });
    } catch (error) {
        logError("Error updating space:", error);
        return fromError(error, "Failed to update space");
    }
}

export async function deleteSpace(
    spaceId: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
        const user = await requireAuth();
        const parsed = objectIdSchema.parse(spaceId);
        const space = await getSpaceDetailService(parsed);
        if (!space) return fail("Space not found");

        if (space.createdBy !== user.id && user.role !== "admin") {
            return fail("Only the space creator or admin can delete this space");
        }

        const result = await deleteSpaceService(parsed, {
            id: user.id, name: user.name || "Unknown", email: user.email,
        });
        return ok(result);
    } catch (error) {
        logError("Error deleting space:", error);
        return fromError(error, "Failed to delete space");
    }
}

// ============================================
// SPACE MEMBERSHIP
// ============================================

export async function addSpaceMember(
    spaceId: string,
    userId: string,
    role: "VIEWER" | "CONTRIBUTOR" | "ADMIN"
): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
        const user = await requireAuth();
        const parsed = addSpaceMemberSchema.parse({ spaceId, userId, role });
        const space = await getSpaceDetailService(parsed.spaceId);
        if (!space) return fail("Space not found");

        const memberRole = space.members.find((m) => m.userId === user.id)?.role;
        if (memberRole !== "ADMIN" && user.role !== "admin") {
            return fail("You don't have permission to add members");
        }

        const result = await addSpaceMemberService(parsed.spaceId, parsed.userId, parsed.role, {
            id: user.id, name: user.name || "Unknown", email: user.email,
        });
        return ok(result);
    } catch (error) {
        logError("Error adding member:", error);
        return fromError(error, "Failed to add member");
    }
}

export async function updateSpaceMember(
    spaceId: string,
    userId: string,
    role: "VIEWER" | "CONTRIBUTOR" | "ADMIN"
): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
        const user = await requireAuth();
        const parsed = updateSpaceMemberSchema.parse({ spaceId, userId, role });
        const space = await getSpaceDetailService(parsed.spaceId);
        if (!space) return fail("Space not found");

        const memberRole = space.members.find((m) => m.userId === user.id)?.role;
        if (memberRole !== "ADMIN" && user.role !== "admin") {
            return fail("You don't have permission to update members");
        }

        const result = await updateSpaceMemberService(parsed.spaceId, parsed.userId, parsed.role, {
            id: user.id, name: user.name || "Unknown", email: user.email,
        });
        return ok(result);
    } catch (error) {
        logError("Error updating member:", error);
        return fromError(error, "Failed to update member");
    }
}

export async function removeSpaceMember(
    spaceId: string,
    userId: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
        const user = await requireAuth();
        const parsed = removeSpaceMemberSchema.parse({ spaceId, userId });
        const space = await getSpaceDetailService(parsed.spaceId);
        if (!space) return fail("Space not found");

        const memberRole = space.members.find((m) => m.userId === user.id)?.role;
        if (memberRole !== "ADMIN" && user.role !== "admin") {
            return fail("You don't have permission to remove members");
        }

        const result = await removeSpaceMemberService(parsed.spaceId, parsed.userId, {
            id: user.id, name: user.name || "Unknown", email: user.email,
        });
        return ok(result);
    } catch (error) {
        logError("Error removing member:", error);
        return fromError(error, "Failed to remove member");
    }
}

export async function addSpaceGroupAccess(
    spaceId: string,
    groupId: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
        const user = await requireAuth();
        const parsedSpaceId = objectIdSchema.parse(spaceId);
        const parsedGroupId = objectIdSchema.parse(groupId);
        const space = await getSpaceDetailService(parsedSpaceId);
        if (!space) return fail("Space not found");

        const memberRole = space.members.find((m) => m.userId === user.id)?.role;
        if (memberRole !== "ADMIN" && user.role !== "admin") {
            return fail("You don't have permission to add group access");
        }

        const result = await addSpaceGroupAccessService(parsedSpaceId, parsedGroupId, {
            id: user.id, name: user.name || "Unknown", email: user.email,
        });
        return ok(result);
    } catch (error) {
        logError("Error adding group access:", error);
        return fromError(error, "Failed to add group access");
    }
}

export async function removeSpaceGroupAccess(
    spaceId: string,
    groupId: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
    try {
        const user = await requireAuth();
        const parsedSpaceId = objectIdSchema.parse(spaceId);
        const parsedGroupId = objectIdSchema.parse(groupId);
        const space = await getSpaceDetailService(parsedSpaceId);
        if (!space) return fail("Space not found");

        const memberRole = space.members.find((m) => m.userId === user.id)?.role;
        if (memberRole !== "ADMIN" && user.role !== "admin") {
            return fail("You don't have permission to remove group access");
        }

        const result = await removeSpaceGroupAccessService(parsedSpaceId, parsedGroupId, {
            id: user.id, name: user.name || "Unknown", email: user.email,
        });
        return ok(result);
    } catch (error) {
        logError("Error removing group access:", error);
        return fromError(error, "Failed to remove group access");
    }
}
