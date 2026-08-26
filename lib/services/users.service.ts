/**
 * User Management Service
 *
 * Business logic for user CRUD operations, role management, and audit logs.
 * Used by admin server actions.
 */

import { getAuthDatabase, getAuthMongoClient } from "@/lib/db";
import { logger } from "@/lib/utils/logger";
import { escapeRegExp } from "@/lib/utils/common";
import { validateMongoQuery } from "@/lib/query/validator";
import { AuditService } from "@/lib/services/audit.service";
import type {
    UserListItem,
    UserListFilters,
    UserDetail,
    PermissionAuditLog,
    AuditLogFilters,
} from "@/types/rbac";

// ============================================
// TYPES
// ============================================

export interface AdminActor {
    id: string;
    email: string;
    name?: string | null;
}

export interface PaginationParams {
    page: number;
    pageSize: number;
}

export interface UserListResult {
    users: UserListItem[];
    pagination: { page: number; pageSize: number; total: number };
}

export interface AuditLogResult {
    logs: PermissionAuditLog[];
    total: number;
    hasMore: boolean;
}

// ============================================
// USER CRUD SERVICES
// ============================================

/**
 * Fetch users with filters and pagination
 */
export async function fetchUsersService(
    filters: UserListFilters | undefined,
    pagination: PaginationParams
): Promise<UserListResult> {
    const db = await getAuthDatabase();
    const { ObjectId } = await import("mongodb");

    // If groupId filter is set, first get the user IDs in that group
    let groupMemberIds: string[] | null = null;
    if (filters?.groupId) {
        const group = await db.collection("groups").findOne(
            { _id: new ObjectId(filters.groupId), deletedAt: null },
            { projection: { memberIds: 1 } }
        );
        if (!group) {
            throw new Error("Group not found");
        }
        groupMemberIds = (group.memberIds || []).map((id: unknown) => id?.toString?.() ?? String(id));
    }

    // Build query
    const query: Record<string, unknown> = { deletedAt: { $exists: false } };

    if (groupMemberIds !== null) {
        if (groupMemberIds.length === 0) {
            return { users: [], pagination: { ...pagination, total: 0 } };
        }
        query._id = { $in: groupMemberIds.map((id) => new ObjectId(id)) };
    }

    if (filters?.search) {
        const escapedSearch = escapeRegExp(filters.search);
        if (escapedSearch.length > 100) throw new Error("Search query too long");
        query.$or = [
            { email: { $regex: escapedSearch, $options: "i" } },
            { name: { $regex: escapedSearch, $options: "i" } },
        ];
    }

    if (filters?.role) {
        query.role = filters.role;
    }


    validateMongoQuery(query);

    const total = await db.collection("app_users").countDocuments(query);
    const users = await db
        .collection("app_users")
        .find(query)
        .sort({ createdAt: -1 })
        .skip((pagination.page - 1) * pagination.pageSize)
        .limit(pagination.pageSize)
        .toArray();

    const userList: UserListItem[] = users.map((user) => ({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        country: user.country,
        lastLogin: user.lastLoginAt,
        status: "active",
        image: user.image,
    }));

    return { users: userList, pagination: { ...pagination, total } };
}

/**
 * Fetch single user detail
 */
export async function fetchUserDetailService(userId: string): Promise<UserDetail | null> {
    const db = await getAuthDatabase();
    const { ObjectId } = await import("mongodb");

    const user = await db
        .collection("app_users")
        .findOne({ _id: new ObjectId(userId), deletedAt: { $exists: false } });

    if (!user) return null;

    return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        country: user.country,
        lastLogin: user.lastLoginAt,
        status: "active",
        image: user.image,
        createdAt: user.createdAt,
        providers: user.providers || [],
    };
}


/**
 * Fetch groups for filter dropdown
 */
export async function fetchGroupsForFilterService(): Promise<
    { id: string; name: string; memberCount: number }[]
> {
    const db = await getAuthDatabase();
    const groups = await db
        .collection("groups")
        .find({ deletedAt: null })
        .project({ name: 1, memberIds: 1 })
        .sort({ name: 1 })
        .toArray();

    return groups.map((group) => ({
        id: group._id.toString(),
        name: group.name,
        memberCount: (group.memberIds || []).length,
    }));
}

// ============================================
// ROLE MANAGEMENT SERVICES
// ============================================

/**
 * Update user role with transaction and audit log
 */
export async function updateUserRoleService(
    userId: string,
    newRole: string,
    admin: AdminActor
): Promise<{ oldRole: string; newRole: string }> {
    const db = await getAuthDatabase();
    const { ObjectId } = await import("mongodb");
    const client = await getAuthMongoClient();
    const session = client.startSession();

    try {
        let oldRole = "";
        let userName = "";
        let userEmail = "";

        await session.withTransaction(async () => {
            const user = await db
                .collection("app_users")
                .findOne({ _id: new ObjectId(userId) }, { session });

            if (!user) throw new Error("User not found");

            oldRole = user.role;
            userName = user.name;
            userEmail = user.email;

            if (oldRole === newRole) {
                throw new Error(`User already has role: ${newRole}`);
            }

            await db.collection("app_users").updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: { role: newRole, updatedAt: new Date() },
                    $inc: { sessionVersion: 1 },
                },
                { session }
            );

            await AuditService.logAction({
                action: "USER_ROLE_CHANGED",
                actor: { id: admin.id, name: admin.name || undefined, email: admin.email },
                targetType: "user",
                targetId: userId,
                targetName: userName,
                details: { oldRole, newRole, reason: "Role assignment via Admin UI", targetEmail: userEmail },
                session,
            });
        });

        logger.info("[USERS SERVICE] Role changed", {
            targetEmail: userEmail,
            oldRole,
            newRole,
            adminEmail: admin.email,
        });

        return { oldRole, newRole };
    } finally {
        await session.endSession();
    }
}

/**
 * Soft delete user
 */
export async function deleteUserService(
    userId: string,
    reason: string | undefined,
    admin: AdminActor
): Promise<void> {
    const db = await getAuthDatabase();
    const { ObjectId } = await import("mongodb");
    const userOid = new ObjectId(userId);

    const user = await db.collection("app_users").findOne({
        _id: userOid,
        deletedAt: { $exists: false },
    });

    if (!user) throw new Error("User not found or already deleted");

    if (user.role === "admin") {
        const otherAdmins = await db.collection("app_users").countDocuments({
            _id: { $ne: userOid },
            role: "admin",
            deletedAt: { $exists: false },
        });
        if (otherAdmins === 0) {
            throw new Error("Cannot delete the last admin user");
        }
    }

    const now = new Date();
    await db.collection("app_users").updateOne(
        { _id: userOid },
        {
            $set: {
                deletedAt: now,
                deletedBy: admin.id,
                deletedReason: reason,
                status: "deleted",
                updatedAt: now,
            },
            $inc: { sessionVersion: 1 },
        }
    );

    await AuditService.logAction({
        action: "USER_DELETED",
        actor: { id: admin.id, name: admin.name || undefined, email: admin.email },
        targetType: "user",
        targetId: userId,
        targetName: user.name,
        details: { reason, targetEmail: user.email },
    });
}

// ============================================
// AUDIT LOG SERVICES
// ============================================

/**
 * Fetch audit logs for a specific user
 */
export async function fetchUserAuditLogsService(
    userId: string,
    limit: number
): Promise<AuditLogResult> {
    const db = await getAuthDatabase();
    const { ObjectId } = await import("mongodb");

    const logs = await db
        .collection("permission_audit_logs")
        .find({ targetType: "user", targetId: new ObjectId(userId) })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

    const total = await db
        .collection("permission_audit_logs")
        .countDocuments({ targetType: "user", targetId: new ObjectId(userId) });

    return {
        logs: mapAuditLogs(logs),
        total,
        hasMore: total > limit,
    };
}

/**
 * Fetch all audit logs with filters
 */
export async function fetchAllAuditLogsService(
    filters: AuditLogFilters | undefined,
    pagination: PaginationParams
): Promise<AuditLogResult> {
    const db = await getAuthDatabase();
    const { ObjectId } = await import("mongodb");

    const query = buildAuditLogQuery(filters, ObjectId);

    const total = await db.collection("permission_audit_logs").countDocuments(query);
    const logs = await db
        .collection("permission_audit_logs")
        .find(query)
        .sort({ timestamp: -1 })
        .skip((pagination.page - 1) * pagination.pageSize)
        .limit(pagination.pageSize)
        .toArray();

    return {
        logs: mapAuditLogs(logs),
        total,
        hasMore: total > pagination.page * pagination.pageSize,
    };
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogsService(
    filters: AuditLogFilters | undefined
): Promise<string> {
    const db = await getAuthDatabase();
    const { ObjectId } = await import("mongodb");

    const query = buildAuditLogQuery(filters, ObjectId);
    const logs = await db
        .collection("permission_audit_logs")
        .find(query)
        .sort({ timestamp: -1 })
        .limit(10000)
        .toArray();

    const headers = [
        "Timestamp", "Action", "Actor Name", "Actor Email",
        "Target Type", "Target Name", "Target Email", "Old Role", "New Role", "Reason",
    ];

    const escapeCSV = (value: string): string => {
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    };

    const rows = logs.map((log) => [
        new Date(log.timestamp).toISOString(),
        log.action,
        log.actorName || "",
        log.actorEmail || "",
        log.targetType,
        log.targetName || "",
        log.targetEmail || "",
        log.details?.oldRole || "",
        log.details?.newRole || "",
        log.details?.reason || "",
    ]);

    return [
        headers.map(escapeCSV).join(","),
        ...rows.map((row) => row.map((cell) => escapeCSV(String(cell))).join(",")),
    ].join("\n");
}

// ============================================
// PERMISSION HELPERS
// ============================================

/**
 * Get user's groups with role information
 */
export async function getUserGroupsService(
    userId: string
): Promise<Array<{
    groupId: string;
    groupName: string;
    roles: Array<{ permissionSetId: string; scope: { type: string; resourceId?: string } }>;
}>> {
    const db = await getAuthDatabase();
    const { ObjectId } = await import("mongodb");

    const user = await db
        .collection("app_users")
        .findOne({ _id: new ObjectId(userId) }, { projection: { groupIds: 1 } });

    if (!user || !user.groupIds || user.groupIds.length === 0) {
        return [];
    }

    const groups = await db
        .collection("groups")
        .find({
            _id: { $in: user.groupIds.map((id: unknown) => new ObjectId(String(id))) },
            deletedAt: null,
        })
        .toArray();

    const result = [];
    for (const group of groups) {
        const roleAssignments = await db
            .collection("role_assignments")
            .find({ targetType: "group", targetId: group._id })
            .toArray();

        result.push({
            groupId: group._id.toString(),
            groupName: group.name,
            roles: roleAssignments.map((ra) => ({
                permissionSetId: ra.permissionSetId,
                scope: ra.scope || { type: "GLOBAL" },
            })),
        });
    }

    return result;
}

/**
 * Get effective permissions for a user
 */
export async function getEffectivePermissionsService(userId: string): Promise<{
    userId: string;
    directRoles: Array<{ permissionSetId: string; targetId: string; targetType: string }>;
    inheritedRoles: Array<{ permissionSetId: string; targetId: string; targetType: string }>;
    computedAt: Date;
}> {
    const db = await getAuthDatabase();
    const { ObjectId } = await import("mongodb");

    const directRoles = await db
        .collection("role_assignments")
        .find({ targetType: "user", targetId: new ObjectId(userId) })
        .toArray();

    const user = await db
        .collection("app_users")
        .findOne({ _id: new ObjectId(userId) }, { projection: { groupIds: 1 } });

    const groupIds = user?.groupIds || [];

    const inheritedRoles = groupIds.length > 0
        ? await db
            .collection("role_assignments")
            .find({
                targetType: "group",
                targetId: { $in: groupIds.map((id: unknown) => new ObjectId(String(id))) },
            })
            .toArray()
        : [];

    const mapRole = (r: unknown) => {
        const role = r as { permissionSetId: string; targetId: unknown; targetType: string };
        return {
            permissionSetId: role.permissionSetId,
            targetId: role.targetId?.toString() || "",
            targetType: role.targetType,
        };
    };

    return {
        userId,
        directRoles: directRoles.map(mapRole),
        inheritedRoles: inheritedRoles.map(mapRole),
        computedAt: new Date(),
    };
}

// ============================================
// INTERNAL HELPERS
// ============================================

function mapAuditLogs(logs: unknown[]): PermissionAuditLog[] {
    return (logs as Record<string, unknown>[]).map((log) => ({
        id: (log._id as { toString(): string }).toString(),
        action: log.action as PermissionAuditLog['action'],
        actorId: (log.actorId as { toString(): string }).toString(),
        actorName: log.actorName as string,
        actorEmail: log.actorEmail as string,
        targetType: log.targetType as PermissionAuditLog['targetType'],
        targetId: (log.targetId as { toString(): string }).toString(),
        targetName: log.targetName as string,
        targetEmail: log.targetEmail as string,
        details: (log.details as Record<string, unknown>) || {},
        timestamp: log.timestamp as Date,
        ipAddress: log.ipAddress as string | undefined,
        userAgent: log.userAgent as string | undefined,
    }));
}

function buildAuditLogQuery(
    filters: AuditLogFilters | undefined,
    ObjectId: typeof import("mongodb").ObjectId
): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (filters?.userId) {
        query.targetId = new ObjectId(filters.userId);
    }
    if (filters?.action) {
        query.action = filters.action;
    }
    if (filters?.actorId) {
        query.actorId = new ObjectId(filters.actorId);
    }
    if (filters?.startDate || filters?.endDate) {
        const timestamp: Record<string, Date> = {};
        if (filters.startDate) timestamp.$gte = filters.startDate;
        if (filters.endDate) timestamp.$lte = filters.endDate;
        query.timestamp = timestamp;
    }

    return query;
}
