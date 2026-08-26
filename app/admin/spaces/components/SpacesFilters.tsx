"use client";

import { Search } from "lucide-react";
import type { SpaceType } from "@/types/spaces";

interface SpacesFiltersProps {
    search: string;
    typeFilter: SpaceType | "";
    onSearchChange: (value: string) => void;
    onTypeChange: (value: SpaceType | "") => void;
    onClearFilters: () => void;
}

/**
 * Spaces Filters Component
 * Search and type filtering UI
 */
export function SpacesFilters({
    search,
    typeFilter,
    onSearchChange,
    onTypeChange,
    onClearFilters,
}: SpacesFiltersProps) {
    return (
        <div className="mb-6 flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search spaces..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            {/* Type filter */}
            <select
                className="px-4 py-2.5 rounded-lg border border-border bg-card/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={typeFilter}
                onChange={(e) => onTypeChange(e.target.value as SpaceType | "")}
            >
                <option value="">All types</option>
                <option value="TEAM">Team</option>
                <option value="PROJECT">Project</option>
                <option value="PERSONAL">Personal</option>
            </select>

            {/* Clear filters */}
            {(search || typeFilter) && (
                <button
                    onClick={onClearFilters}
                    className="px-4 py-2.5 rounded-lg border border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                    Clear filters
                </button>
            )}
        </div>
    );
}
