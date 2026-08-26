/**
 * Share Modal Constants
 * UI configuration constants for the share modal
 */

import {
    Lock,
    Users,
    Globe,
    Eye,
    Pencil,
    Shield,
    User,
    Layers,
} from "lucide-react";
import type { DashboardSharingMode, DashboardPermission, SharingTargetType } from "@/types/spaces";

// =============================================================================
// Sharing Mode Configuration
// =============================================================================

export const SHARING_MODES: {
    mode: DashboardSharingMode;
    label: string;
    description: string;
    icon: React.ReactNode;
}[] = [
        {
            mode: "PRIVATE",
            label: "Private",
            description: "Only you can access",
            icon: <Lock className="w-4 h-4" />,
        },
        {
            mode: "CUSTOM",
            label: "Custom",
            description: "Share with specific people or teams",
            icon: <Users className="w-4 h-4" />,
        },
        {
            mode: "PUBLIC",
            label: "Public",
            description: "Anyone in the organization",
            icon: <Globe className="w-4 h-4" />,
        },
    ];

// =============================================================================
// Permission Options
// =============================================================================

export const PERMISSION_OPTIONS: {
    value: DashboardPermission;
    label: string;
    description: string;
    icon: React.ReactNode;
}[] = [
        {
            value: "VIEW",
            label: "Can view",
            description: "View dashboard and widgets",
            icon: <Eye className="w-4 h-4" />,
        },
        {
            value: "EDIT",
            label: "Can edit",
            description: "Modify widgets and layout",
            icon: <Pencil className="w-4 h-4" />,
        },
        {
            value: "ADMIN",
            label: "Full access",
            description: "Share with others and manage",
            icon: <Shield className="w-4 h-4" />,
        },
    ];

// =============================================================================
// Target Type Visual Configuration
// =============================================================================

export const TARGET_TYPE_ICONS: Record<SharingTargetType, React.ReactNode> = {
    USER: <User className="w-4 h-4" />,
    GROUP: <Users className="w-4 h-4" />,
    SPACE: <Layers className="w-4 h-4" />,
};

export const TARGET_TYPE_COLORS: Record<SharingTargetType, string> = {
    USER: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    GROUP: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    SPACE: "text-purple-400 bg-purple-500/10 border-purple-500/30",
};

// =============================================================================
// Permission Label Helpers
// =============================================================================

export function getPermissionLabel(permission: DashboardPermission): string {
    switch (permission) {
        case "VIEW":
            return "Can view";
        case "EDIT":
            return "Can edit";
        case "ADMIN":
            return "Full access";
        default:
            return permission;
    }
}
