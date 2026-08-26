"use client";

import { Shield, ChevronRight, AlertTriangle, Lock } from "lucide-react";
import type { PermissionSet } from "@/types/rbac";

interface RoleCardProps {
    role: PermissionSet;
    onClick: () => void;
}

export function RoleCard({ role, onClick }: RoleCardProps) {
    // Get colors based on role ID
    const getRoleStyles = () => {
        switch (role.id) {
            case "admin":
                return {
                    badge: "bg-red-500/10 text-red-400 border-red-500/30",
                    icon: "text-red-400",
                    card: "bg-red-500/5 border-red-500/30",
                    hoverIcon: "group-hover:text-red-400"
                };
            case "supervisor":
                return {
                    badge: "bg-teal-500/10 text-teal-400 border-teal-500/30",
                    icon: "text-teal-400",
                    card: "bg-teal-500/5 border-teal-500/30",
                    hoverIcon: "group-hover:text-teal-400"
                };
            case "operator":
                return {
                    badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
                    icon: "text-blue-400",
                    card: "bg-blue-500/5 border-blue-500/30",
                    hoverIcon: "group-hover:text-blue-400"
                };
            case "viewer":
                return {
                    badge: "bg-gray-500/10 text-gray-400 border-gray-500/30",
                    icon: "text-gray-400",
                    card: "bg-gray-500/5 border-gray-500/30",
                    hoverIcon: "group-hover:text-gray-400"
                };
            default:
                return {
                    badge: "bg-muted text-muted-foreground border-border",
                    icon: "text-muted-foreground",
                    card: "bg-muted/5 border-border",
                    hoverIcon: "group-hover:text-primary"
                };
        }
    };

    const styles = getRoleStyles();

    return (
        <div
            onClick={onClick}
            className={`border rounded-xl p-6 hover:shadow-lg hover:bg-opacity-10 transition-all cursor-pointer group ${styles.card}`}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                    <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border ${styles.card}`}
                    >
                        <Shield className={`w-6 h-6 ${styles.icon}`} />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${styles.badge}`}>
                                {role.name}
                            </span>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                            {role.description}
                        </p>

                        {/* Permissions Count */}
                        <div className="flex items-center gap-4 text-xs font-medium">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Lock className="w-3.5 h-3.5" />
                                <span>
                                    {role.permissionIds.includes("*")
                                        ? "Full Access Control"
                                        : `${role.permissionIds.length} Scope${role.permissionIds.length !== 1 ? "s" : ""}`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <ChevronRight className={`w-5 h-5 text-muted-foreground transition-colors ${styles.hoverIcon}`} />
                </div>
            </div>

            {/* Admin Warning */}
            {role.id === "admin" && (
                <div className="mt-4 pt-4 border-t border-red-500/30">
                    <div className="flex items-center gap-2 text-amber-400 text-[11px] font-semibold uppercase tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Critical Privilege Role</span>
                    </div>
                </div>
            )}
        </div>
    );
}
