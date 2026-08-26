"use client";

/**
 * useShareTargetSearch Hook
 * Manages the search functionality for finding users, groups, and spaces to share with
 */

import { useState, useEffect, useCallback } from "react";
import { searchShareTargets } from "@/app/actions/spaces";
import type { ShareTargetSearchResult } from "@/types/spaces";

interface UseShareTargetSearchOptions {
    excludeIds?: string[];
    debounceMs?: number;
    maxResults?: number;
}

interface UseShareTargetSearchReturn {
    query: string;
    setQuery: (query: string) => void;
    results: ShareTargetSearchResult[];
    searching: boolean;
    showResults: boolean;
    clearSearch: () => void;
}

export function useShareTargetSearch(options: UseShareTargetSearchOptions = {}): UseShareTargetSearchReturn {
    const { excludeIds = [], debounceMs = 300, maxResults = 8 } = options;

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ShareTargetSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Search targets with debounce
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setShowResults(false);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const response = await searchShareTargets(
                    query,
                    undefined,
                    excludeIds,
                    maxResults
                );
                if (response.success && response.data) {
                    setResults(response.data.results);
                    setShowResults(true);
                }
            } catch {
                // Ignore search errors
            } finally {
                setSearching(false);
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [query, excludeIds.join(','), debounceMs, maxResults]);

    const clearSearch = useCallback(() => {
        setQuery("");
        setResults([]);
        setShowResults(false);
    }, []);

    return {
        query,
        setQuery,
        results,
        searching,
        showResults,
        clearSearch,
    };
}
