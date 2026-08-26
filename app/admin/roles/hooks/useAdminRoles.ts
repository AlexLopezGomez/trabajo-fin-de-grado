"use client";

import { useState, useEffect, useCallback } from "react";
import { getPermissionSets } from "@/app/actions/admin/roles/index";
import type { PermissionSet } from "@/types/rbac";

export function useAdminRoles() {
    const [roles, setRoles] = useState<PermissionSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRoles = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await getPermissionSets();
            if (response.success && response.data) {
                // Filter to only built-in roles (exclude any custom roles if they exist)
                const builtInOnly = response.data.roles.filter((r) => !r.isCustom);
                setRoles(builtInOnly);
            } else {
                setError(response.error || "Failed to load roles");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    return {
        roles,
        builtInRoles: roles, // All roles are now built-in
        loading,
        error,
        refreshRoles: fetchRoles,
    };
}

