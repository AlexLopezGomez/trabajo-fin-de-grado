"use client";

import { useState, useCallback, useEffect } from "react";
import { getGroups } from "@/app/actions/admin/groups";
import type { Group } from "@/types/rbac";

interface InitialGroupsData {
    groups: Group[];
    total: number;
}

export function useAdminGroups(pageSize = 50, initialData?: InitialGroupsData) {
    const [groups, setGroups] = useState<Group[]>(initialData?.groups ?? []);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(initialData?.total ?? 0);
    const [isInitialRender, setIsInitialRender] = useState(!!initialData);

    const refreshList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getGroups(search || undefined, page, pageSize);
            if (response.success && response.data) {
                setGroups(response.data.groups);
                setTotal(response.data.pagination.total);
            } else {
                setError(response.error || "Failed to load groups");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [search, page, pageSize]);

    useEffect(() => {
        if (isInitialRender) {
            setIsInitialRender(false);
            return;
        }
        refreshList();
    }, [refreshList]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearchChange = (term: string) => {
        setSearch(term);
        setPage(1);
    };

    return {
        groups,
        loading,
        error,
        search,
        page,
        total,
        totalPages: Math.ceil(total / pageSize),
        refreshList,
        setSearch: handleSearchChange,
        setPage,
    };
}
