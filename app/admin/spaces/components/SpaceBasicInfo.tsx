"use client";

import { Users, Building2, Briefcase, FolderKanban, User } from "lucide-react";
import type { SpaceType } from "@/types/spaces";

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

interface SpaceBasicInfoProps {
    name: string;
    description: string;
    type: SpaceType;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onTypeChange: (value: SpaceType) => void;
}

/**
 * Space Basic Info Component
 * Form fields for name, type, and description
 */
export function SpaceBasicInfo({
    name,
    description,
    type,
    onNameChange,
    onDescriptionChange,
    onTypeChange,
}: SpaceBasicInfoProps) {
    return (
        <>
            {/* Name */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Name
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="Marketing Team"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                />
            </div>

            {/* Type */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {(["TEAM", "PROJECT", "PERSONAL"] as SpaceType[]).map(
                        (t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => onTypeChange(t)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${type === t
                                    ? SPACE_TYPE_COLORS[t] + " border-2"
                                    : "border-border bg-muted/30 text-muted-foreground hover:border-border/80"
                                    }`}
                            >
                                {SPACE_TYPE_ICONS[t]}
                                <span className="capitalize text-sm">{t.toLowerCase()}</span>
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Description
                    <span className="text-muted-foreground font-normal ml-1">
                        (optional)
                    </span>
                </label>
                <textarea
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="A brief description of this space..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
            </div>
        </>
    );
}
