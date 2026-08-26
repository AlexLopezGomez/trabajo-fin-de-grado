"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    getGroupDetail,
    getGroupMembers,
    getGroupAuditLogs,
    deleteGroup,
} from "@/app/actions/admin/groups";
import type { Group, PermissionAuditLog } from "@/types/rbac";
import { logger } from "@/lib/utils/logger";

export function useGroupDetail(id: string) {
    const router = useRouter();
    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<
        Array<{
            id: string;
            name: string;
            email: string;
            role: string;
        }>
    >([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [memberCount, setMemberCount] = useState(0);
    const [roleCount, setRoleCount] = useState(0);
    const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([]);
    const [auditLogsLoading, setAuditLogsLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchGroup = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (!id) {
                setError("Invalid group id");
                setLoading(false);
                return;
            }
            const response = await getGroupDetail(id);

            if (response.success && response.data) {
                setGroup(response.data.group);
                setMemberCount(response.data.memberCount);
                setRoleCount(response.data.roleCount);
            } else {
                setError(response.error || "Group not found");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchMembers = useCallback(async () => {
        try {
            if (!id) return;
            const response = await getGroupMembers(id, 1, 100); // Get first 100 members

            if (response.success && response.data) {
                setMembers(response.data.members);
            }
        } catch (err) {
            logger.error("Failed to fetch members", err);
        }
    }, [id]);

    const fetchAuditLogs = useCallback(async () => {
        if (!group?.id) return;

        setAuditLogsLoading(true);
        try {
            const response = await getGroupAuditLogs(group.id, 10); // Get last 10 entries
            if (response.success && response.data) {
                setAuditLogs(response.data.logs);
            }
        } catch (err) {
            logger.error("Failed to fetch audit logs", err);
        } finally {
            setAuditLogsLoading(false);
        }
    }, [group?.id]);

    useEffect(() => {
        fetchGroup();
        fetchMembers();
    }, [fetchGroup, fetchMembers]);

    useEffect(() => {
        if (group?.id) {
            fetchAuditLogs();
        }
    }, [group?.id, fetchAuditLogs]);

    const handleDelete = async () => {
        if (!group) return;

        setDeleting(true);
        try {
            const response = await deleteGroup(group.id);
            if (response.success) {
                router.push("/admin/groups");
            } else {
                // Return error for UI to handle
                setDeleting(false);
                throw new Error(response.error || "Failed to delete group");
            }
        } catch (err) {
            setDeleting(false);
            throw err;
        }
    };

    return {
        group,
        members,
        loading,
        error,
        memberCount,
        roleCount,
        setRoleCount, // Allow updating from role assignment component
        auditLogs,
        auditLogsLoading,
        deleting,
        handleDelete,
    };
}
