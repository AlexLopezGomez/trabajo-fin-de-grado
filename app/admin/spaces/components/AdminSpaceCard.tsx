"use client";

import { Users, LayoutDashboard, Building2, Briefcase, FolderKanban, User } from "lucide-react";
import type { SpaceSummary, SpaceType } from "@/types/spaces";

const SPACE_TYPE_ICONS: Record<SpaceType, React.ReactNode> = {
    TEAM: <Users className="w-4 h-4" />,
    PROJECT: <FolderKanban className="w-4 h-4" />,
    PERSONAL: <User className="w-4 h-4" />,
};

const SPACE_TYPE_COLORS: Record<SpaceType, string> = {
    TEAM: "text-primary bg-primary/10 border-primary/30",
    PROJECT: "text-primary bg-primary/10 border-primary/30",
    PERSONAL: "text-accent bg-accent/10 border-accent/30",
};

interface AdminSpaceCardProps {
    space: SpaceSummary;
    onClick: () => void;
}

/**
 * Admin Space Card Component
 * Individual space card with type icon, stats, and hover effects
 */
export function AdminSpaceCard({ space, onClick }: AdminSpaceCardProps) {
    return (
        <div
            onClick={onClick}
            className="bg-card/50 border border-border rounded-lg p-5 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer group"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className={`p-2 rounded-lg border ${SPACE_TYPE_COLORS[space.type]}`}
                    >
                        {SPACE_TYPE_ICONS[space.type]}
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {space.name}
                        </h3>
                        <span
                            className={`text-xs px-2 py-0.5 rounded border ${SPACE_TYPE_COLORS[space.type]}`}
                        >
                            {space.type.toLowerCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Description */}
            {space.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {space.description}
                </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{space.memberCount} members</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>{space.dashboardCount} dashboards</span>
                </div>
            </div>
        </div>
    );
}
