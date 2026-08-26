import type { UserRole } from "@/auth";
import { BuiltInRoleId } from "@/lib/auth/rbac/built-in-roles";

/**
 * Role definition with full details
 */
export interface RoleDefinition {
    id: UserRole;
    name: string;
    description: string;
    color: string;
    collections: string[];
    permissions: {
        id: string;
        name: string;
        description: string;
    }[];
    fieldMasking: {
        collection: string;
        field: string;
        canAccess: boolean;
    }[];
    rowLevelFilters: string;
    isSystemRole: boolean;
}

/**
 * Role usage statistics
 */
export interface RoleUsage {
    roleId: UserRole;
    directUserCount: number;
    groupCount: number;
    inheritedUserCount: number;
}

/**
 * Built-in role definitions (only 3 predefined roles)
 * Custom roles (e.g., finance, sales, support) are created via Admin UI
 */
export const ROLE_DEFINITIONS: Record<BuiltInRoleId, Omit<RoleDefinition, "id" | "collections" | "fieldMasking">> = {
    admin: {
        name: "Administrator",
        description: "Full system access with unrestricted permissions across all collections, dashboards, and administrative functions. Can manage users, groups, and role assignments.",
        color: "red",
        permissions: [
            { id: "view_all", name: "View All Data", description: "Access to view all collections and records" },
            { id: "edit_all", name: "Edit All Data", description: "Ability to modify any record in any collection" },
            { id: "delete_all", name: "Delete Data", description: "Can delete records from any collection" },
            { id: "manage_users", name: "Manage Users", description: "Create, edit, and deactivate user accounts" },
            { id: "manage_roles", name: "Manage Roles", description: "Assign and revoke roles for users and groups" },
            { id: "view_audit_logs", name: "View Audit Logs", description: "Access to permission change history" },
            { id: "manage_dashboards", name: "Manage Dashboards", description: "Full control over all dashboards" },
            { id: "approve_queries", name: "Approve Queries", description: "Can approve or reject heavy query execution requests" },
        ],
        rowLevelFilters: "None - sees all data globally",
        isSystemRole: true,
    },
    supervisor: {
        name: "Supervisor",
        description: "High-level access for department leads. Can view all data, manage dashboards, and approve heavy queries. Cannot manage system-wide user/role settings.",
        color: "teal",
        permissions: [
            { id: "view_all", name: "View All Data", description: "Access to view all collections and records" },
            { id: "manage_dashboards", name: "Manage Dashboards", description: "Full control over all dashboards" },
            { id: "view_query_approvals", name: "View Approvals", description: "Can view the history of query approval requests" },
            { id: "approve_queries", name: "Approve Queries", description: "Can approve or reject heavy query execution requests" },
        ],
        rowLevelFilters: "None - sees all data",
        isSystemRole: true,
    },
    operator: {
        name: "Operator",
        description: "Standard data analyst role. Can create queries and dashboards. Heavy queries require approval from a Supervisor or Admin.",
        color: "blue",
        permissions: [
            { id: "view_all_collections", name: "View All Collections", description: "Access to view all business data collections" },
            { id: "create_queries", name: "Create Queries", description: "Generate and execute AI queries" },
            { id: "create_dashboards", name: "Create Dashboards", description: "Can create new dashboards with allowed data" },
            { id: "edit_own_dashboards", name: "Edit Own Dashboards", description: "Can modify dashboards they created" },
            { id: "share_dashboards", name: "Share Dashboards", description: "Can share dashboards with other users" },
            { id: "view_query_approvals", name: "View Own Approvals", description: "Can view the status of their own approval requests" },
        ],
        rowLevelFilters: "Standard - full data access, restricted execution for heavy queries",
        isSystemRole: true,
    },
    viewer: {
        name: "Viewer",
        description: "Read-only access to shared dashboards and public data. Cannot create queries or modify any content.",
        color: "gray",
        permissions: [
            { id: "view_public_dashboards", name: "View Public Dashboards", description: "Can view dashboards marked as public" },
            { id: "view_shared_spaces", name: "View Shared Spaces", description: "Can view dashboards in spaces they are invited to" },
        ],
        rowLevelFilters: "Strict - limited to shared or public content",
        isSystemRole: true,
    },
};
