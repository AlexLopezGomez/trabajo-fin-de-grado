"use client";

import { Layers, Plus } from "lucide-react";

interface AdminSpacesHeaderProps {
    spaceCount: number;
    onCreateClick: () => void;
}

/**
 * Admin Spaces Page Header
 * Displays title, description, and create button
 */
export function AdminSpacesHeader({ spaceCount, onCreateClick }: AdminSpacesHeaderProps) {
    return (
        <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                            <Layers className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Spaces</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage logical containers for dashboards
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                            <span className="text-primary font-medium">
                                {spaceCount} spaces
                            </span>
                        </div>
                        <button
                            onClick={onCreateClick}
                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-foreground rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create Space
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
