"use client";

import { Lock, CheckCircle2 } from "lucide-react";
import { PERMISSION_CATALOG } from "@/lib/auth/permissions/catalog";

// Helper to get permission details
const getPermissionDetails = (permissionId: string) => {
    if (permissionId === "*") {
        return { name: "All Permissions", description: "Full access to all system features" };
    }
    const perm = PERMISSION_CATALOG.find(p => p.id === permissionId);
    return perm || { name: permissionId, description: "Permission" };
};

export function PermissionsList({ permissionIds }: { permissionIds: string[] }) {
    return (
        <div className="bg-card/50 border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Permissions ({permissionIds.includes("*") ? "All" : permissionIds.length})
            </h2>
            <div className="space-y-3">
                {permissionIds.map((permId) => {
                    const perm = getPermissionDetails(permId);
                    return (
                        <div
                            key={permId}
                            className="p-3 rounded-lg bg-muted/20 border border-border"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span className="font-medium text-white">{perm.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground pl-6">
                                {perm.description}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
