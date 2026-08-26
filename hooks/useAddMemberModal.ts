/**
 * useAddMemberModal Hook
 * 
 * Extracts business logic from AddMemberModal:
 * - User/group data loading
 * - Selection state management
 * - Filtering and search
 * - Add operations with error handling
 * 
 * @module hooks/useAddMemberModal
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { getUsers } from "@/app/actions/admin/users";
import { getGroups } from "@/app/actions/admin/groups";
import { addSpaceMember, addSpaceGroupAccess } from "@/app/actions/spaces";
import { error as logError } from "@/lib/utils/logger";

export type SpaceRole = "VIEWER" | "CONTRIBUTOR" | "ADMIN";
export type ModalTab = "users" | "groups";

export interface User {
    id: string;
    name: string;
    email: string;
}

export interface Group {
    id: string;
    name: string;
    memberCount: number;
}

export interface AddedMember {
    userId: string;
    userName: string;
    userEmail: string;
    role: SpaceRole;
}

export interface AddedGroup {
    groupId: string;
    groupName: string;
}

export interface UseAddMemberModalProps {
    spaceId: string;
    existingMemberIds: string[];
    existingGroupIds: string[];
    onMembersAdded: (members: AddedMember[]) => void;
    onGroupsAdded: (groups: AddedGroup[]) => void;
    onClose: () => void;
}

export interface UseAddMemberModalReturn {
    // Data
    filteredUsers: User[];
    filteredGroups: Group[];
    loadingData: boolean;

    // Selection
    selectedUserIds: string[];
    selectedGroupIds: string[];
    userRole: SpaceRole;
    totalSelected: number;

    // Search
    userSearch: string;
    groupSearch: string;

    // UI
    activeTab: ModalTab;
    adding: boolean;
    error: string | null;

    // Actions
    setUserSearch: (search: string) => void;
    setGroupSearch: (search: string) => void;
    setActiveTab: (tab: ModalTab) => void;
    setUserRole: (role: SpaceRole) => void;
    toggleUser: (userId: string) => void;
    toggleGroup: (groupId: string) => void;
    handleAdd: () => Promise<void>;
}

/**
 * Hook for managing Add Member Modal state and operations.
 * 
 * @example
 * ```tsx
 * const {
 *   filteredUsers,
 *   selectedUserIds,
 *   toggleUser,
 *   handleAdd,
 * } = useAddMemberModal({
 *   spaceId: "...",
 *   existingMemberIds: [...],
 *   existingGroupIds: [...],
 *   onMembersAdded: (members) => {...},
 *   onGroupsAdded: (groups) => {...},
 *   onClose: () => {...},
 * });
 * ```
 */
export function useAddMemberModal({
    spaceId,
    existingMemberIds,
    existingGroupIds,
    onMembersAdded,
    onGroupsAdded,
    onClose,
}: UseAddMemberModalProps): UseAddMemberModalReturn {
    // Data state
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Selection state
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [userRole, setUserRole] = useState<SpaceRole>("VIEWER");

    // Search/filter state
    const [userSearch, setUserSearch] = useState("");
    const [groupSearch, setGroupSearch] = useState("");

    // UI state
    const [activeTab, setActiveTab] = useState<ModalTab>("users");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load all users and groups on mount
    useEffect(() => {
        async function loadData() {
            setLoadingData(true);
            try {
                const [usersResponse, groupsResponse] = await Promise.all([
                    getUsers({}, 1, 100),
                    getGroups(undefined, 1, 100),
                ]);

                if (usersResponse.success && usersResponse.data) {
                    // Filter out existing members
                    setUsers(
                        usersResponse.data.users
                            .filter((u) => !existingMemberIds.includes(u.id))
                            .map((u) => ({ id: u.id, name: u.name, email: u.email }))
                    );
                }

                if (groupsResponse.success && groupsResponse.data) {
                    // Filter out existing groups
                    setGroups(
                        groupsResponse.data.groups
                            .filter((g: { id: string }) => !existingGroupIds.includes(g.id))
                            .map((g: { id: string; name: string; memberIds?: string[] }) => ({
                                id: g.id,
                                name: g.name,
                                memberCount: g.memberIds?.length || 0,
                            }))
                    );
                }
            } catch (err) {
                logError("Failed to load data", err);
                setError("Failed to load users and groups");
            } finally {
                setLoadingData(false);
            }
        }

        loadData();
    }, [existingMemberIds, existingGroupIds]);

    // Memoized filtered lists
    const filteredUsers = useMemo(() =>
        users.filter(
            (u) =>
                u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                u.email.toLowerCase().includes(userSearch.toLowerCase())
        ),
        [users, userSearch]
    );

    const filteredGroups = useMemo(() =>
        groups.filter((g) =>
            g.name.toLowerCase().includes(groupSearch.toLowerCase())
        ),
        [groups, groupSearch]
    );

    // Selection toggles
    const toggleUser = useCallback((userId: string) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    }, []);

    const toggleGroup = useCallback((groupId: string) => {
        setSelectedGroupIds((prev) =>
            prev.includes(groupId)
                ? prev.filter((id) => id !== groupId)
                : [...prev, groupId]
        );
    }, []);

    // Add operation
    const handleAdd = useCallback(async () => {
        if (selectedUserIds.length === 0 && selectedGroupIds.length === 0) return;

        setAdding(true);
        setError(null);

        try {
            const addedMembers: AddedMember[] = [];
            const addedGroups: AddedGroup[] = [];
            const errors: string[] = [];

            // Add users
            for (const userId of selectedUserIds) {
                const user = users.find((u) => u.id === userId);
                if (!user) continue;

                const response = await addSpaceMember(spaceId, userId, userRole);
                if (response.success) {
                    addedMembers.push({
                        userId,
                        userName: user.name,
                        userEmail: user.email,
                        role: userRole,
                    });
                } else {
                    errors.push(`Failed to add ${user.name}: ${response.error}`);
                }
            }

            // Add groups
            for (const groupId of selectedGroupIds) {
                const group = groups.find((g) => g.id === groupId);
                if (!group) continue;

                const response = await addSpaceGroupAccess(spaceId, groupId);
                if (response.success) {
                    addedGroups.push({
                        groupId,
                        groupName: group.name,
                    });
                } else {
                    errors.push(`Failed to add group ${group.name}: ${response.error}`);
                }
            }

            // Report results
            if (addedMembers.length > 0) {
                onMembersAdded(addedMembers);
            }
            if (addedGroups.length > 0) {
                onGroupsAdded(addedGroups);
            }

            if (errors.length > 0) {
                setError(errors.join("\n"));
            } else {
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error adding members");
        } finally {
            setAdding(false);
        }
    }, [
        selectedUserIds,
        selectedGroupIds,
        users,
        groups,
        spaceId,
        userRole,
        onMembersAdded,
        onGroupsAdded,
        onClose,
    ]);

    const totalSelected = selectedUserIds.length + selectedGroupIds.length;

    return {
        // Data
        filteredUsers,
        filteredGroups,
        loadingData,

        // Selection
        selectedUserIds,
        selectedGroupIds,
        userRole,
        totalSelected,

        // Search
        userSearch,
        groupSearch,

        // UI
        activeTab,
        adding,
        error,

        // Actions
        setUserSearch,
        setGroupSearch,
        setActiveTab,
        setUserRole,
        toggleUser,
        toggleGroup,
        handleAdd,
    };
}
