"use client";

import { useState, useEffect } from "react";
import { getSpaces } from "@/app/actions/spaces";
import type { SpaceSummary, SpaceType } from "@/types/spaces";

/**
 * Custom hook for managing admin spaces list
 * Handles data fetching and filtering
 */
export function useAdminSpaces() {
    const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<SpaceType | "">("");

    useEffect(() => {
        async function fetchSpaces() {
            setLoading(true);
            setError(null);

            try {
                const response = await getSpaces(
                    {
                        search: search || undefined,
                        type: typeFilter || undefined,
                    },
                    1,
                    50
                );

                if (response.success && response.data) {
                    setSpaces(response.data.spaces);
                } else {
                    setError(response.error || "Failed to load spaces");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        }

        fetchSpaces();
    }, [search, typeFilter]);

    const clearFilters = () => {
        setSearch("");
        setTypeFilter("");
    };

    return {
        spaces,
        loading,
        error,
        search,
        setSearch,
        typeFilter,
        setTypeFilter,
        clearFilters,
    };
}
