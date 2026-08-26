"use client";

/**
 * AccessListItem Component
 * Single item in the access list (user/group/space with permission controls)
 */

import { Trash2 } from "lucide-react";
import { TARGET_TYPE_ICONS, TARGET_TYPE_COLORS, getPermissionLabel } from "./constants";
import type { AccessListItemProps } from "./types";
import type { DashboardPermission } from "@/types/spaces";

export function AccessListItem({
    access,
    canManage,
    onUpdatePermission,
    onRemove,
}: AccessListItemProps) {
    return (
        <div
            className={`flex items-center justify-between p-3 ${access.pendingRemoval ? 'opacity-50 line-through' : ''
                } ${access.pending ? 'bg-amber-500/5 border-l-2 border-amber-500' : ''}`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded border ${TARGET_TYPE_COLORS[access.type]}`}>
                    {TARGET_TYPE_ICONS[access.type]}
                </div>
                <div>
                    <div className="text-sm font-medium text-white">
                        {access.name}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                        {access.type.toLowerCase()}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {access.pending && (
                    <span className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Pending
                    </span>
                )}

                {access.pendingRemoval && (
                    <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                        Will be removed
                    </span>
                )}

                {!access.pendingRemoval && (
                    <>
                        {canManage ? (
                            <>
                                <select
                                    value={access.permission}
                                    onChange={(e) =>
                                        onUpdatePermission(
                                            access.id,
                                            e.target.value as DashboardPermission
                                        )
                                    }
                                    className="text-xs px-2 py-1 rounded bg-muted/50 border border-border text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                >
                                    <option value="VIEW">Can view</option>
                                    <option value="EDIT">Can edit</option>
                                    <option value="ADMIN">Full access</option>
                                </select>
                                <button
                                    onClick={() => onRemove(access.id)}
                                    className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <span className="text-xs px-2 py-1 rounded bg-muted/50 text-muted-foreground">
                                {getPermissionLabel(access.permission)}
                            </span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
