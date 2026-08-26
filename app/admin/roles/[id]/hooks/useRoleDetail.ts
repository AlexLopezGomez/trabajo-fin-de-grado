"use client";

import { useState, useEffect, useCallback } from "react";
import { getPermissionSet, getRoleUsage } from "@/app/actions/admin/roles/index";
import type { PermissionSet } from "@/types/rbac";

export function useRoleDetail(id?: string) {
    const [role, setRole] = useState<PermissionSet | null>(null);
    const [usage, setUsage] = useState<{ userCount: number; groupCount: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!id) return;

        setLoading(true);
        setError(null);

        try {
            const [roleResponse, usageResponse] = await Promise.all([
                getPermissionSet(id),
                getRoleUsage(id),
            ]);

            if (roleResponse.success && roleResponse.data) {
                setRole(roleResponse.data.role);
            } else {
                setError(roleResponse.error || "Failed to load role");
            }

            if (usageResponse.success && usageResponse.data) {
                setUsage(usageResponse.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Helper to determine color theme
    const getRoleColor = useCallback(() => {
        if (!role) return "gray";
        if (role.deprecated) return "orange";
        switch (role.id) {
            case "admin": return "red";
            case "supervisor": return "teal";
            case "operator": return "blue";
            case "viewer": return "gray";
            default: return "gray";
        }
    }, [role]);

    return {
        role,
        usage,
        loading,
        error,
        getRoleColor,
        refreshRole: fetchData,
    };
}
