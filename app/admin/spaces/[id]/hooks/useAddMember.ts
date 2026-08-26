"use client";

import { useState, useEffect } from "react";
import { getUsers } from "@/app/actions/admin/users";
import { getGroups } from "@/app/actions/admin/groups";
import { addSpaceMember, addSpaceGroupAccess } from "@/app/actions/spaces";
import { error as logError } from "@/lib/utils/logger";

type SpaceRole = "VIEWER" | "CONTRIBUTOR" | "ADMIN";

/**
 * Hook for managing Add Member/Group modal logic
 * Handles the complex state for adding users and groups to a space
 */
export function useAddMember(
    spaceId: string,
    existingMemberIds: string[],
    existingGroupIds: string[],
    onSuccess: () => void
) {
    // Data state
    const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
    const [groups, setGroups] = useState<Array<{ id: string; name: string; memberCount: number }>>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Selection state
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [userRole, setUserRole] = useState<SpaceRole>("VIEWER");

    // Search state
    const [userSearch, setUserSearch] = useState("");
    const [groupSearch, setGroupSearch] = useState("");

    // UI state
    const [activeTab, setActiveTab] = useState<"users" | "groups">("users");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load data on mount
    useEffect(() => {
        async function loadData() {
            setLoadingData(true);
            try {
                const [usersResponse, groupsResponse] = await Promise.all([
                    getUsers({}, 1, 100),
                    getGroups(undefined, 1, 100),
                ]);

                if (usersResponse.success && usersResponse.data) {
                    setUsers(
                        usersResponse.data.users
                            .filter((u) => !existingMemberIds.includes(u.id))
                            .map((u) => ({ id: u.id, name: u.name, email: u.email }))
                    );
                }

                if (groupsResponse.success && groupsResponse.data) {
                    setGroups(
                        groupsResponse.data.groups
                            .filter((g: any) => !existingGroupIds.includes(g.id))
                            .map((g: any) => ({
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

    // Filter by search
    const filteredUsers = users.filter(
        (u) =>
            u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase())
    );

    const filteredGroups = groups.filter((g) =>
        g.name.toLowerCase().includes(groupSearch.toLowerCase())
    );

    const toggleUser = (userId: string) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const toggleGroup = (groupId: string) => {
        setSelectedGroupIds((prev) =>
            prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
        );
    };

    const handleAdd = async () => {
        if (selectedUserIds.length === 0 && selectedGroupIds.length === 0) return;

        setAdding(true);
        setError(null);

        try {
            const errors: string[] = [];

            // Add users
            for (const userId of selectedUserIds) {
                const user = users.find((u) => u.id === userId);
                if (!user) continue;

                const response = await addSpaceMember(spaceId, userId, userRole);
                if (!response.success) {
                    errors.push(`Failed to add ${user.name}: ${response.error}`);
                }
            }

            // Add groups
            for (const groupId of selectedGroupIds) {
                const group = groups.find((g) => g.id === groupId);
                if (!group) continue;

                const response = await addSpaceGroupAccess(spaceId, groupId);
                if (!response.success) {
                    errors.push(`Failed to add group ${group.name}: ${response.error}`);
                }
            }

            if (errors.length > 0) {
                setError(errors.join("\n"));
            } else {
                onSuccess();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error adding members");
        } finally {
            setAdding(false);
        }
    };

    const totalSelected = selectedUserIds.length + selectedGroupIds.length;

    return {
        // Data
        users: filteredUsers,
        groups: filteredGroups,
        loadingData,

        // Selection
        selectedUserIds,
        selectedGroupIds,
        userRole,
        setUserRole,
        toggleUser,
        toggleGroup,

        // Search
        userSearch,
        setUserSearch,
        groupSearch,
        setGroupSearch,

        // UI
        activeTab,
        setActiveTab,
        adding,
        error,
        totalSelected,

        // Actions
        handleAdd,
    };
}
