/**
 * Permission Catalog - Complete list of available permissions
 */

import { Permission } from "@/types/rbac";

/**
 * All available permissions in the system
 */
export const PERMISSION_CATALOG: Permission[] = [
  // Dashboard Permissions
  {
    id: "view_dashboard",
    name: "View Dashboard",
    description: "Can view dashboards and their widgets",
    category: "dashboard",
  },
  {
    id: "create_dashboard",
    name: "Create Dashboard",
    description: "Can create new dashboards",
    category: "dashboard",
  },
  {
    id: "edit_dashboard",
    name: "Edit Dashboard",
    description: "Can modify existing dashboards",
    category: "dashboard",
  },
  {
    id: "delete_dashboard",
    name: "Delete Dashboard",
    description: "Can delete dashboards",
    category: "dashboard",
  },
  {
    id: "share_dashboard",
    name: "Share Dashboard",
    description: "Can control dashboard sharing settings",
    category: "dashboard",
  },
  {
    id: "execute_widget",
    name: "Execute Widget",
    description: "Can run widget queries and see results",
    category: "dashboard",
  },

  // Space Permissions
  {
    id: "view_space",
    name: "View Space",
    description: "Can see a space exists and browse it",
    category: "space",
  },
  {
    id: "create_space",
    name: "Create Space",
    description: "Can create new spaces",
    category: "space",
  },
  {
    id: "manage_space",
    name: "Manage Space",
    description: "Can modify space settings and members",
    category: "space",
  },
  {
    id: "delete_space",
    name: "Delete Space",
    description: "Can delete spaces",
    category: "space",
  },

  // Query Permissions
  {
    id: "create_query",
    name: "Create Query",
    description: "Can create and save queries",
    category: "query",
  },
  {
    id: "view_query",
    name: "View Query",
    description: "Can view saved queries",
    category: "query",
  },
  {
    id: "edit_query",
    name: "Edit Query",
    description: "Can modify saved queries",
    category: "query",
  },
  {
    id: "delete_query",
    name: "Delete Query",
    description: "Can delete queries",
    category: "query",
  },
  {
    id: "run_expensive_queries",
    name: "Run Expensive Queries",
    description: "Can execute queries with high computational cost (score > 70)",
    category: "query",
  },
  {
    id: "approve_queries",
    name: "Approve Queries",
    description: "Can approve heavy queries submitted by Operators",
    category: "query",
  },
  {
    id: "view_query_approvals",
    name: "View Query Approvals",
    description: "Can view the query approval queue and history",
    category: "query",
  },

  // User Management Permissions
  {
    id: "view_users",
    name: "View Users",
    description: "Can see user list (admin function)",
    category: "user",
  },
  {
    id: "manage_users",
    name: "Manage Users",
    description: "Can create, edit, and deactivate user accounts",
    category: "user",
  },
  {
    id: "manage_roles",
    name: "Manage Roles",
    description: "Can assign and revoke roles for users and groups",
    category: "user",
  },
  {
    id: "view_groups",
    name: "View Groups",
    description: "Can see group list",
    category: "user",
  },
  {
    id: "manage_groups",
    name: "Manage Groups",
    description: "Can create, edit, and delete groups",
    category: "user",
  },

  // System Permissions
  {
    id: "view_audit_logs",
    name: "View Audit Logs",
    description: "Access to permission change history",
    category: "system",
  },
  {
    id: "manage_system_settings",
    name: "Manage System Settings",
    description: "Can modify system-wide configuration",
    category: "system",
  },
  {
    id: "admin_all",
    name: "Full Admin Access",
    description: "Unrestricted access to all resources (wildcard)",
    category: "system",
  },
];

/**
 * Get permissions by category
 */
export function getPermissionsByCategory(): Record<string, Permission[]> {
  const byCategory: Record<string, Permission[]> = {
    dashboard: [],
    space: [],
    query: [],
    user: [],
    system: [],
  };

  PERMISSION_CATALOG.forEach((permission) => {
    byCategory[permission.category].push(permission);
  });

  return byCategory;
}

/**
 * Get permission by ID
 */
export function getPermissionById(id: string): Permission | undefined {
  return PERMISSION_CATALOG.find((p) => p.id === id);
}

