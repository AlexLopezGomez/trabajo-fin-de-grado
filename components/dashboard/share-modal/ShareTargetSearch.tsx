"use client";

/**
 * ShareTargetSearch Component
 * Search input with dropdown results for adding users/groups/spaces
 */

import { Search, Plus, AlertCircle } from "lucide-react";
import { TARGET_TYPE_ICONS, TARGET_TYPE_COLORS } from "./constants";
import type { ShareTargetSearchProps } from "./types";

export function ShareTargetSearch({
    query,
    onQueryChange,
    results,
    searching,
    showResults,
    onAddTarget,
    error,
}: ShareTargetSearchProps) {
    return (
        <div>
            <label className="block text-sm font-medium text-white mb-2">
                Add people, teams, or spaces
            </label>

            {/* Error message */}
            {error && (
                <div className="mb-3 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-muted/50 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />

                {/* Search Results Dropdown */}
                {showResults && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                        {searching ? (
                            <div className="p-3 text-center text-muted-foreground text-sm">
                                Searching...
                            </div>
                        ) : results.length === 0 ? (
                            <div className="p-3 text-center text-muted-foreground text-sm">
                                No results found
                            </div>
                        ) : (
                            results.map((result) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => onAddTarget(result)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                                >
                                    <div
                                        className={`p-1.5 rounded border ${TARGET_TYPE_COLORS[result.type]}`}
                                    >
                                        {TARGET_TYPE_ICONS[result.type]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">
                                            {result.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {result.description}
                                            {result.memberCount !== undefined && (
                                                <span className="ml-1">
                                                    • {result.memberCount} members
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Plus className="w-4 h-4 text-muted-foreground" />
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
