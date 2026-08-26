"use client";

import { ArrowLeft, Users, UserPlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Group } from "@/types/rbac";

interface GroupDetailHeaderProps {
    group: Group;
    onDeleteClick: () => void;
}

export function GroupDetailHeader({
    group,
    onDeleteClick,
}: GroupDetailHeaderProps) {
    const router = useRouter();

    return (
        <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/admin/groups")}
                            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">{group.name}</h1>
                                <p className="text-sm text-muted-foreground">
                                    {group.description || "No description"}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push(`/admin/groups/${group.id}/members`)}
                            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            Manage Members
                        </button>
                        <button
                            onClick={onDeleteClick}
                            className="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Group
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
