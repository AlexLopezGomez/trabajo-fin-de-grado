"use client";

import { Users, Plus } from "lucide-react";

interface GroupsHeaderProps {
    total: number;
    onCreate: () => void;
}

export function GroupsHeader({ total, onCreate }: GroupsHeaderProps) {
    return (
        <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                            <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Groups</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage user groups and group-based permissions
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                            <span className="text-primary font-medium">
                                {total} groups
                            </span>
                        </div>
                        <button
                            onClick={onCreate}
                            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Group
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
