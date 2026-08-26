"use client";

import { XCircle, CheckCircle2 } from "lucide-react";
import type { PermissionSet } from "@/types/rbac";

export function RoleRestrictions({ role }: { role: PermissionSet }) {
    const hasFullAccess = role.id === "admin" || role.permissionIds.includes("*");
    const collections = role.dataAccess?.collections || [];

    return (
        <div className="bg-card/50 border border-border rounded-lg p-6 mt-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                Restrictions
            </h2>
            <div className="space-y-2">
                {hasFullAccess ? (
                    <div className="text-emerald-400 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        This role has no restrictions - full system access
                    </div>
                ) : (
                    <>
                        {!role.permissionIds.includes("manage_user") && (
                            <>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <XCircle className="w-4 h-4 text-red-400" />
                                    Cannot access admin panel or manage users
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <XCircle className="w-4 h-4 text-red-400" />
                                    Cannot assign or revoke roles
                                </div>
                            </>
                        )}
                        {!collections.includes("users") && !collections.includes("*") && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <XCircle className="w-4 h-4 text-red-400" />
                                Cannot access user data
                            </div>
                        )}
                        {!collections.includes("transactions") && !collections.includes("*") && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <XCircle className="w-4 h-4 text-red-400" />
                                Cannot access transaction data
                            </div>
                        )}
                        {!collections.includes("wallets") && !collections.includes("*") && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <XCircle className="w-4 h-4 text-red-400" />
                                Cannot access wallet data
                            </div>
                        )}
                        {!collections.includes("orders") && !collections.includes("*") && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <XCircle className="w-4 h-4 text-red-400" />
                                Cannot access order data
                            </div>
                        )}
                        {!role.permissionIds.includes("create_dashboard") && !role.permissionIds.includes("edit_dashboard") && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <XCircle className="w-4 h-4 text-red-400" />
                                Cannot create or edit dashboards
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
