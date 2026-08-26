/**
 * useSpaceDetail Hook
 * 
 * Extracts business logic from SpaceDetailPage:
 * - Space fetching and state management
 * - Member/group CRUD operations
 * - Loading and error states
 * 
 * @module hooks/useSpaceDetail
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    getSpaceDetail,
    removeSpaceMember,
    updateSpaceMember,
    removeSpaceGroupAccess,
    deleteSpace,
} from "@/app/actions/spaces";
import type { Space } from "@/types/spaces";
import { error as logError } from "@/lib/utils/logger";

export type SpaceRole = "VIEWER" | "CONTRIBUTOR" | "ADMIN";
export type TabType = "members" | "settings";

export interface UseSpaceDetailReturn {
    // State
    space: Space | null;
    loading: boolean;
    error: string | null;
    activeTab: TabType;
    showAddMemberModal: boolean;
    showDeleteConfirm: boolean;

    // Actions
    setActiveTab: (tab: TabType) => void;
    setShowAddMemberModal: (show: boolean) => void;
    setShowDeleteConfirm: (show: boolean) => void;
    refreshSpace: () => Promise<void>;
    handleRemoveMember: (userId: string) => Promise<void>;
    handleUpdateRole: (userId: string, newRole: SpaceRole) => Promise<void>;
    handleDeleteSpace: () => Promise<void>;
    handleRemoveGroupAccess: (groupId: string) => Promise<void>;
}

/**
 * Hook for managing space detail page state and operations.
 * 
 * @param spaceId - The ID of the space to manage
 * @returns Object containing state and action handlers
 * 
 * @example
 * ```tsx
 * const {
 *   space,
 *   loading,
 *   error,
 *   handleRemoveMember,
 *   handleUpdateRole,
 * } = useSpaceDetail(spaceId);
 * ```
 */
export function useSpaceDetail(spaceId: string): UseSpaceDetailReturn {
    const router = useRouter();

    // Core state
    const [space, setSpace] = useState<Space | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI state
    const [activeTab, setActiveTab] = useState<TabType>("members");
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Refresh space data (used after mutations)
    const refreshSpace = useCallback(async () => {
        try {
            const response = await getSpaceDetail(spaceId);
            if (response.success && response.data) {
                setSpace(response.data.space);
            }
        } catch (err) {
            logError("Failed to refresh space", err);
        }
    }, [spaceId]);

    // Initial fetch
    useEffect(() => {
        async function fetchSpace() {
            setLoading(true);
            setError(null);

            try {
                const response = await getSpaceDetail(spaceId);
                if (response.success && response.data) {
                    setSpace(response.data.space);
                } else {
                    setError(response.error || "Failed to load space");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        }

        fetchSpace();
    }, [spaceId]);

    // Member operations
    const handleRemoveMember = useCallback(async (userId: string) => {
        if (!space) return;

        try {
            const response = await removeSpaceMember(space.id, userId);
            if (response.success) {
                await refreshSpace();
            } else {
                alert(response.error || "Failed to remove member");
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : "Error removing member");
        }
    }, [space, refreshSpace]);

    const handleUpdateRole = useCallback(async (userId: string, newRole: SpaceRole) => {
        if (!space) return;

        try {
            const response = await updateSpaceMember(space.id, userId, newRole);
            if (response.success) {
                await refreshSpace();
            } else {
                alert(response.error || "Failed to update role");
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : "Error updating role");
        }
    }, [space, refreshSpace]);

    // Group operations
    const handleRemoveGroupAccess = useCallback(async (groupId: string) => {
        if (!space) return;

        try {
            const response = await removeSpaceGroupAccess(space.id, groupId);
            if (response.success) {
                await refreshSpace();
            } else {
                alert(response.error || "Failed to remove group access");
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : "Error removing group access");
        }
    }, [space, refreshSpace]);

    // Space operations
    const handleDeleteSpace = useCallback(async () => {
        if (!space) return;

        try {
            const response = await deleteSpace(space.id);
            if (response.success) {
                router.push("/admin/spaces");
            } else {
                alert(response.error || "Failed to delete space");
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : "Error deleting space");
        }
    }, [space, router]);

    return {
        // State
        space,
        loading,
        error,
        activeTab,
        showAddMemberModal,
        showDeleteConfirm,

        // Actions
        setActiveTab,
        setShowAddMemberModal,
        setShowDeleteConfirm,
        refreshSpace,
        handleRemoveMember,
        handleUpdateRole,
        handleDeleteSpace,
        handleRemoveGroupAccess,
    };
}
