"use client";

/**
 * AccessList Component
 * Container for the owner row and all access items
 */

import { User } from "lucide-react";
import { AccessListItem } from "./AccessListItem";
import type { AccessListProps } from "./types";
import type { DashboardPermission } from "@/types/spaces";

export function AccessList({
    accessList,
    ownerName,
    mode,
    canManage,
    onUpdatePermission,
    onRemove,
}: AccessListProps) {
    // Only show if in CUSTOM mode or there are access entries
    if (mode !== "CUSTOM" && accessList.length === 0) {
        return null;
    }

    return (
        <div>
            <label className="block text-sm font-medium text-white mb-2">
                People with access
            </label>
            <div className="border border-border rounded-lg divide-y divide-border">
                {/* Owner */}
                <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded border text-amber-400 bg-amber-500/10 border-amber-500/30">
                            <User className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-white">
                                {ownerName || "Owner"}
                            </div>
                            <div className="text-xs text-muted-foreground">Owner</div>
                        </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Full access
                    </span>
                </div>

                {/* Shared with */}
                {accessList.map((access) => (
                    <AccessListItem
                        key={access.id}
                        access={access}
                        canManage={canManage}
                        onUpdatePermission={onUpdatePermission}
                        onRemove={onRemove}
                    />
                ))}

                {accessList.length === 0 && mode === "CUSTOM" && (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        No one else has access yet
                    </div>
                )}
            </div>
        </div>
    );
}
