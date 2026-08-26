"use client";

import type { PermissionSet } from "@/types/rbac";
import { Shield, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface RoleDetailHeaderProps {
    role: PermissionSet;
    color: string;
}

/**
 * Role Detail Header Component
 * Displays role information, breadcrumbs, and status badges
 */
export function RoleDetailHeader({ role, color }: RoleDetailHeaderProps) {
    const router = useRouter();

    const getColorClasses = () => {
        switch (role.id) {
            case "admin":
                return "bg-red-500/10 text-red-400 border-red-500/30";
            case "supervisor":
                return "bg-teal-500/10 text-teal-400 border-teal-500/30";
            case "operator":
                return "bg-blue-500/10 text-blue-400 border-blue-500/30";
            case "viewer":
                return "bg-gray-500/10 text-gray-400 border-gray-500/30";
            default:
                return "bg-orange-500/10 text-orange-400 border-orange-500/30";
        }
    };

    return (
        <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <button
                        onClick={() => router.push("/admin/roles")}
                        className="hover:text-white transition-colors"
                    >
                        Roles
                    </button>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-white font-medium">{role.name}</span>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg border ${getColorClasses()}`}>
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
                                    {role.name}
                                </h1>
                                {/* Deprecated role indicator */}
                                {role.id.includes('deprecated') && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white uppercase tracking-wider">
                                        Deprecated
                                    </span>
                                )}
                            </div>
                            <p className="text-muted-foreground mt-1 max-w-2xl text-sm italic">
                                {role.description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
