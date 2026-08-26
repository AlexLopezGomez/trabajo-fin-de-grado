import type {
  DashboardWithSharing,
  DashboardPermission,
  ResolvedAccess,
} from "@/types/spaces";
import { resolveAccessCore, type AccessResolutionContext } from "./access-resolver.service";
import { getUserContext } from "./user-context.service";

/**
 * Dashboard Access Service
 *
 * Dashboard-specific access control logic.
 * Provides high-level functions for dashboard permission checking.
 */

/**
 * Resolve access for a user on a specific dashboard
 *
 * This is the main entry point for dashboard access resolution.
 * It loads user context, checks admin roles, and delegates to the core resolver.
 */
export async function resolveDashboardAccess(
  userId: string,
  userRole: string,
  dashboard: DashboardWithSharing
): Promise<ResolvedAccess> {
  // Load user context (groups and spaces)
  const userContext = await getUserContext(userId);

  // Check if user has global admin role
  const { isAdminRole } = await import("@/lib/auth/guards");
  const hasAdminRole = await isAdminRole(userRole);

  // Create resolution context
  const context: AccessResolutionContext = {
    userId,
    userRole,
    userContext,
    isAdminRole: hasAdminRole,
    resource: dashboard,
  };

  // Resolve access using core logic
  return resolveAccessCore(context);
}

/**
 * Check if user has at least the required permission on a dashboard
 */
export async function checkDashboardPermission(
  userId: string,
  userRole: string,
  dashboard: DashboardWithSharing,
  requiredPermission: DashboardPermission
): Promise<boolean> {
  const access = await resolveDashboardAccess(userId, userRole, dashboard);

  if (!access.hasAccess || !access.permission) {
    return false;
  }

  const { hasPermissionLevel } = await import("./permission-utils");
  return hasPermissionLevel(access.permission, requiredPermission);
}

/**
 * Check if user can view a dashboard
 */
export async function canViewDashboard(
  userId: string,
  userRole: string,
  dashboard: DashboardWithSharing
): Promise<boolean> {
  return checkDashboardPermission(userId, userRole, dashboard, "VIEW");
}

/**
 * Check if user can edit a dashboard
 */
export async function canEditDashboard(
  userId: string,
  userRole: string,
  dashboard: DashboardWithSharing
): Promise<boolean> {
  return checkDashboardPermission(userId, userRole, dashboard, "EDIT");
}

/**
 * Check if user can administer a dashboard
 */
export async function canAdminDashboard(
  userId: string,
  userRole: string,
  dashboard: DashboardWithSharing
): Promise<boolean> {
  return checkDashboardPermission(userId, userRole, dashboard, "ADMIN");
}

/**
 * Get all dashboards accessible by a user with their access info
 * This is a facade function that maintains backward compatibility
 */
export async function getAccessibleDashboards(
  userId: string,
  userRole: string,
  filters?: {
    spaceId?: string | null;
    sharingMode?: string;
    permission?: "CAN_EDIT" | "VIEW_ONLY";
    showArchived?: boolean;
    showSharedWithMe?: boolean;
    showMyDashboards?: boolean;
    search?: string;
  },
  pagination?: { page: number; pageSize: number }
): Promise<{ dashboards: (DashboardWithSharing & { userAccess: ResolvedAccess })[]; total: number }> {
  // Load user context and admin status
  const { getUserContext } = await import("./user-context.service");
  const { isAdminRole } = await import("@/lib/auth/guards");

  const userContext = await getUserContext(userId);
  const isAdmin = await isAdminRole(userRole);

  const page = pagination?.page || 1;
  const pageSize = pagination?.pageSize || 20;

  // Create query context
  const context = {
    userId,
    userRole,
    userContext,
    isAdmin,
    filters: filters || {},
    pagination: { page, pageSize },
  };

  // Use the specialized query service
  const { getAccessibleDashboardsWithAccess } = await import("./dashboard-queries.service");
  return getAccessibleDashboardsWithAccess(context);
}

/**
 * Get user's effective permission on a dashboard
 */
export async function getUserDashboardPermission(
  userId: string,
  userRole: string,
  dashboard: DashboardWithSharing
): Promise<DashboardPermission | null> {
  const access = await resolveDashboardAccess(userId, userRole, dashboard);
  return access.permission;
}

/**
 * Check if user is the owner of a dashboard
 */
export function isDashboardOwner(
  userId: string,
  dashboard: DashboardWithSharing
): boolean {
  return dashboard.createdBy === userId;
}

/**
 * Validate that a permission transition is allowed
 * (Used when changing sharing rules or permissions)
 */
export function validatePermissionTransition(
  currentPermission: DashboardPermission | null,
  newPermission: DashboardPermission
): { valid: boolean; error?: string } {
  if (!currentPermission) {
    return { valid: true }; // No current permission means any new permission is valid
  }

  const { PERMISSION_LEVELS } = require("./permission-utils");

  // Generally, permissions can be increased but not decreased
  // unless the user is an admin (who can set any permission)
  if (PERMISSION_LEVELS[newPermission] < PERMISSION_LEVELS[currentPermission]) {
    return {
      valid: false,
      error: `Cannot reduce permission from ${currentPermission} to ${newPermission}`,
    };
  }

  return { valid: true };
}