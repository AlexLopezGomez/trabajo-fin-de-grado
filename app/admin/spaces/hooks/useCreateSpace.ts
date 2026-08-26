"use client";

import { useState, useEffect } from "react";
import { createSpace } from "@/app/actions/spaces";
import { getGroups } from "@/app/actions/admin/groups";
import { getUsers } from "@/app/actions/admin/users";
import { logger } from "@/lib/utils/logger";
import type { SpaceType, SpaceSummary } from "@/types/spaces";

/**
 * Custom hook for create space modal logic
 * Handles form state, access control, and submission
 */
export function useCreateSpace(onCreated: (space: SpaceSummary) => void) {
    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<SpaceType>("TEAM");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Access control state
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [showAccessSection, setShowAccessSection] = useState(false);

    // Available groups and users
    const [groups, setGroups] = useState<Array<{ id: string; name: string; memberCount: number }>>([]);
    const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Fetch groups and users when access section is shown
    useEffect(() => {
        if (showAccessSection && groups.length === 0 && users.length === 0) {
            fetchGroupsAndUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAccessSection]);

    const fetchGroupsAndUsers = async () => {
        setLoadingData(true);
        try {
            // Fetch groups
            const groupsResponse = await getGroups(undefined, 1, 100);
            if (groupsResponse.success && groupsResponse.data) {
                setGroups(groupsResponse.data.groups.map((g: any) => ({
                    id: g.id,
                    name: g.name,
                    memberCount: g.memberIds?.length || 0,
                })));
            }

            // Fetch users
            const usersResponse = await getUsers({}, 1, 100);
            if (usersResponse.success && usersResponse.data) {
                setUsers(usersResponse.data.users.map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                })));
            }
        } catch (err) {
            logger.error("Failed to load groups/users", err);
        } finally {
            setLoadingData(false);
        }
    };

    const toggleGroup = (groupId: string) => {
        setSelectedGroupIds(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const toggleUser = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await createSpace({
                name,
                description: description || undefined,
                type,
                initialGroupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
                initialMemberUserIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
            });

            if (response.success && response.data) {
                onCreated(response.data.space as SpaceSummary);
                // Reset form
                setName("");
                setDescription("");
                setType("TEAM");
                setSelectedGroupIds([]);
                setSelectedUserIds([]);
                setShowAccessSection(false);
            } else {
                setError(response.error || "Failed to create space");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    return {
        // Form state
        name,
        setName,
        description,
        setDescription,
        type,
        setType,
        loading,
        error,

        // Access control
        selectedGroupIds,
        selectedUserIds,
        showAccessSection,
        setShowAccessSection,
        toggleGroup,
        toggleUser,

        // Data
        groups,
        users,
        loadingData,

        // Actions
        handleSubmit,
    };
}
