/**
 * useUserDetail Hook
 * 
 * Extracts business logic from UserDetailPage:
 * - User fetching and state management
 * - Roles, groups, audit logs fetching
 * - Role change and delete operations
 * 
 * @module hooks/useUserDetail
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    getUserDetail,
    getUserAuditLogs,
    getUserGroupsForUser,
    deleteUser,
} from "@/app/actions/admin/users";
import { getPermissionSets } from "@/app/actions/admin/roles/index";
import type { UserDetail, PermissionAuditLog, PermissionSet } from "@/types/rbac";
import { error as logError } from "@/lib/utils/logger";

export interface UserGroup {
    groupId: string;
    groupName: string;
    roles: Array<{
        permissionSetId: string;
        scope: { type: string; resourceId?: string };
    }>;
}

export interface UseUserDetailReturn {
    // Core data
    user: UserDetail | null;
    loading: boolean;
    error: string | null;

    // Related data
    roles: PermissionSet[];
    userGroups: UserGroup[];
    groupsLoading: boolean;
    auditLogs: PermissionAuditLog[];
    auditLogsLoading: boolean;

    // Modal state
    showRoleModal: boolean;
    showDeleteModal: boolean;
    deleteReason: string;
    deleting: boolean;
    deleteError: string | null;

    // Actions
    setShowRoleModal: (show: boolean) => void;
    setShowDeleteModal: (show: boolean) => void;
    setDeleteReason: (reason: string) => void;
    setDeleteError: (error: string | null) => void;
    handleRoleChangeSuccess: () => void;
    handleDelete: () => Promise<void>;
    getRoleBadgeClass: (roleId: string) => string;
}

/**
 * Hook for managing user detail page state and operations.
 * 
 * @param userId - The ID of the user to manage
 * @returns Object containing state and action handlers
 * 
 * @example
 * ```tsx
 * const {
 *   user,
 *   loading,
 *   roles,
 *   handleRoleChangeSuccess,
 * } = useUserDetail(userId);
 * ```
 */
export function useUserDetail(userId: string | undefined): UseUserDetailReturn {
    const router = useRouter();

    // Core state
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Related data
    const [roles, setRoles] = useState<PermissionSet[]>([]);
    const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([]);
    const [auditLogsLoading, setAuditLogsLoading] = useState(false);

    // Modal state
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteReason, setDeleteReason] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Fetch user data
    const fetchUser = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (!userId) {
                setError("Invalid user id");
                setLoading(false);
                return;
            }
            const response = await getUserDetail(userId);

            if (response.success && response.data) {
                setUser(response.data.user);
            } else {
                setError(response.error || "User not found");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Fetch roles
    const fetchRoles = useCallback(async () => {
        try {
            const response = await getPermissionSets();
            if (response.success && response.data) {
                setRoles(response.data.roles);
            }
        } catch (err) {
            logError("Error fetching roles", err);
        }
    }, []);

    // Fetch user groups
    const fetchUserGroups = useCallback(async () => {
        if (!user?.id) return;

        setGroupsLoading(true);
        try {
            const response = await getUserGroupsForUser(user.id);
            if (response.success && response.data) {
                setUserGroups(response.data);
            }
        } catch (err) {
            logError("Failed to fetch user groups", err);
        } finally {
            setGroupsLoading(false);
        }
    }, [user?.id]);

    // Fetch audit logs
    const fetchAuditLogs = useCallback(async () => {
        if (!user?.id) return;

        setAuditLogsLoading(true);
        try {
            const response = await getUserAuditLogs(user.id, 10);
            if (response.success && response.data) {
                setAuditLogs(response.data.logs);
            }
        } catch (err) {
            logError("Failed to fetch audit logs", err);
        } finally {
            setAuditLogsLoading(false);
        }
    }, [user?.id]);

    // Initial fetch
    useEffect(() => {
        fetchUser();
        fetchRoles();
    }, [fetchUser, fetchRoles]);

    // Fetch related data after user loads
    useEffect(() => {
        if (user?.id) {
            fetchAuditLogs();
            fetchUserGroups();
        }
    }, [user?.id, fetchAuditLogs, fetchUserGroups]);

    // Role change success handler
    const handleRoleChangeSuccess = useCallback(() => {
        fetchUser();
        fetchAuditLogs();
    }, [fetchUser, fetchAuditLogs]);

    // Delete handler
    const handleDelete = useCallback(async () => {
        if (!user) return;

        setDeleting(true);
        setDeleteError(null);
        try {
            const res = await deleteUser({ userId: user.id, reason: deleteReason });
            if (res.success) {
                router.push("/admin/users");
            } else {
                setDeleteError(res.error || "Failed to delete user");
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to delete user";
            setDeleteError(message);
        } finally {
            setDeleting(false);
        }
    }, [user, deleteReason, router]);

    // Role badge styling utility
    const getRoleBadgeClass = useCallback((roleId: string) => {
        const baseClass =
            "px-4 py-2 rounded-lg text-sm font-medium border inline-flex items-center gap-2";

        // Find role in fetched roles array
        const roleData = roles.find(r => r.id === roleId);

        // Custom roles get purple styling
        if (roleData?.isCustom) {
            return `${baseClass} bg-purple-500/10 text-purple-400 border-purple-500/30`;
        }

        // Built-in functional roles
        switch (roleId) {
            case "admin":
                return `${baseClass} bg-red-500/10 text-red-400 border-red-500/30`;
            case "supervisor":
                return `${baseClass} bg-teal-500/10 text-teal-400 border-teal-500/30`;
            case "operator":
                return `${baseClass} bg-blue-500/10 text-blue-400 border-blue-500/30`;
            case "viewer":
                return `${baseClass} bg-gray-500/10 text-gray-400 border-gray-500/30`;
            // Deprecated roles
            case "sales":
            case "finance":
            case "support":
                return `${baseClass} bg-orange-500/10 text-orange-400 border-orange-500/30`;
            default:
                return `${baseClass} bg-muted/30 text-muted-foreground border-border`;
        }
    }, [roles]);

    return {
        // Core data
        user,
        loading,
        error,

        // Related data
        roles,
        userGroups,
        groupsLoading,
        auditLogs,
        auditLogsLoading,

        // Modal state
        showRoleModal,
        showDeleteModal,
        deleteReason,
        deleting,
        deleteError,

        // Actions
        setShowRoleModal,
        setShowDeleteModal,
        setDeleteReason,
        setDeleteError,
        handleRoleChangeSuccess,
        handleDelete,
        getRoleBadgeClass,
    };
}
