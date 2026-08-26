"use client";

import { Shield } from "lucide-react";
import type { PermissionSet } from "@/types/rbac";

interface UserRoleSectionProps {
    userRole: string;
    roles: PermissionSet[];
    getRoleBadgeClass: (role: string) => string;
}

/**
 * User Role Section Component
 * Displays current role with badge and description
 */
export function UserRoleSection({
    userRole,
    roles,
    getRoleBadgeClass,
}: UserRoleSectionProps) {
    const currentRole = roles.find(r => r.id === userRole);

    return (
        <div className="bg-card/50 border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Role & Permissions
            </h2>

            <div className="space-y-4">
                {/* Current role */}
                <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                        Current Role
                    </label>
                    <div className={getRoleBadgeClass(userRole)}>
                        <Shield className="w-4 h-4" />
                        <span>{currentRole?.name || userRole}</span>
                    </div>
                </div>

                {/* Role description */}
                <div className="p-4 bg-muted/30 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">
                        {currentRole?.description ||
                            "No description available for this role."}
                    </p>
                </div>
            </div>
        </div>
    );
}
