/**
 * Authentication Guard Utilities
 *
 * Provides secure, reusable functions for protecting Server Actions.
 * Every server action that modifies data MUST use these guards.
 *
 * Usage:
 * ```typescript
 * export async function sensitiveAction() {
 *   const user = await requireAuth(); // Throws if not authenticated
 *   // ... action logic
 * }
 *
 * export async function adminOnlyAction() {
 *   const user = await requireRole(['admin']); // Throws if not admin
 *   // ... action logic
 * }
 * ```
 */

import { auth } from "@/auth";
import { UserRole } from "@/auth";
import { withAuthDatabase } from "@/lib/db/helpers";
import { headers } from "next/headers";
import { logger } from "@/lib/utils/logger";
import { withNamespaceField, namespaceOrLegacyFilter } from "@/lib/db/namespace";

// ============================================
// CUSTOM ERROR CLASSES
// ============================================

/**
 * Authentication/Authorization error
 * Provides structured error information for clients
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID_SESSION"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ============================================
// CORE AUTH GUARDS
// ============================================

/**
 * Require authentication for a server action
 * @throws AuthError if user is not authenticated
 * @returns The authenticated user object
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    throw new AuthError(
      "Authentication required. Please sign in.",
      "UNAUTHENTICATED"
    );
  }

  // Validate that user has required fields
  if (!session.user.id || !session.user.role) {
    throw new AuthError(
      "Invalid session. Please sign in again.",
      "INVALID_SESSION"
    );
  }

  return session.user;
}

/**
 * Require specific role(s) for a server action
 * @param allowedRoles - Array of roles that can access this action
 * @throws AuthError if user doesn't have required role
 * @returns The authenticated user object
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${user.role}`,
      "FORBIDDEN"
    );
  }

  return user;
}

/**
 * Require ownership of a resource OR admin role
 * Used for actions where users can only modify their own resources
 *
 * @param resourceOwnerId - The ID of the resource owner
 * @throws AuthError if user doesn't own the resource and isn't admin
 * @returns The authenticated user object
 */
export async function requireOwnership(resourceOwnerId: string) {
  const user = await requireAuth();

  // Admins can access any resource
  if (user.role === "admin") {
    return user;
  }

  // Regular users can only access their own resources
  if (user.id !== resourceOwnerId) {
    throw new AuthError(
      "You don't have permission to access this resource.",
      "FORBIDDEN"
    );
  }

  return user;
}

/**
 * Require admin role specifically
 * Convenience function for admin-only actions
 */
export async function requireAdmin() {
  return requireRole(["admin"]);
}

// ============================================
// PERMISSION-BASED AUTHORIZATION
// ============================================

/**
 * Check if a role has admin-level permissions
 * 
 * More flexible than checking roleId === "admin"
 * Supports custom roles with admin-level access
 * 
 * @param roleId - Role identifier
 * @returns True if role is admin or has admin permissions
 */
export async function isAdminRole(roleId: string): Promise<boolean> {
  // Built-in admin role
  if (roleId === 'admin') return true;

  // Check for custom roles with admin permissions
  const { getPermissionSetForRole } = await import('@/lib/auth/rbac');
  const permissionSet = await getPermissionSetForRole(roleId);
  if (!permissionSet) return false;

  // Custom roles with wildcard collection access are considered admin-level
  if (permissionSet.dataAccess.collections === '*') return true;

  return false;
}

/**
 * Check if a role has a specific permission
 * 
 * @param roleId - Role identifier
 * @param permissionId - Permission to check (e.g., "dashboard:create", "system:admin")
 * @returns True if role has the permission
 * 
 * @note Currently placeholder - requires permission catalog implementation
 */
export async function roleHasPermission(
  roleId: string,
  permissionId: string
): Promise<boolean> {
  const { getPermissionSetForRole } = await import('@/lib/auth/rbac');
  const permissionSet = await getPermissionSetForRole(roleId);
  if (!permissionSet) return false;

  // Check if role has wildcard permissions (admin)
  if (permissionSet.isBuiltIn && roleId === 'admin') return true;

  // For custom roles, check permissionIds array
  // Note: Built-in roles don't have permissionIds in the current implementation
  // This would need to be added to built-in-roles.ts for full support
  return false; // Placeholder - needs permission catalog implementation
}

/**
 * Require specific permission for a server action
 * 
 * @param permissionId - Required permission
 * @throws AuthError if user doesn't have the permission
 * @returns The authenticated user object
 */
export async function requirePermission(permissionId: string) {
  const user = await requireAuth();

  const hasPermission = await roleHasPermission(user.role, permissionId);

  if (!hasPermission) {
    throw new AuthError(
      `Access denied. Required permission: ${permissionId}`,
      'FORBIDDEN'
    );
  }

  return user;
}

/**
 * Check if current user has admin-level access
 * More flexible than requireRole(['admin'])
 * Supports custom roles with admin-level permissions
 * 
 * @throws AuthError if user is not admin
 * @returns The authenticated user object
 */
export async function requireAdminAccess() {
  const user = await requireAuth();

  const hasAdminRole = await isAdminRole(user.role);

  if (!hasAdminRole) {
    throw new AuthError(
      'Access denied. Administrator privileges required.',
      'FORBIDDEN'
    );
  }

  return user;
}

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Log an action to the audit trail
 * Should be called for all sensitive operations
 */
export async function logAction(
  action: string,
  userId: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    await withAuthDatabase(async (db) => {
      await db.collection("action_audit_logs").insertOne(withNamespaceField({
        action,
        userId,
        details,
        timestamp: new Date(),
      }));
    });
  } catch (error) {
    // Don't fail the action if logging fails
    logger.error('[AUDIT] Failed to log action', error, {
      action,
      userId,
    });
  }
}

/**
 * Log an action with full user context
 * Captures more details for compliance/security investigations
 */
export function logActionWithContext(
  action: string,
  details: Record<string, unknown> = {}
): void {
  _logActionWithContextAsync(action, details).catch((error) => {
    logger.error('[AUDIT] Background audit log failed', error, { action });
  });
}

async function _logActionWithContextAsync(
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  const session = await auth();

  if (!session?.user) {
    logger.warn('[AUDIT] Cannot log action - no session', { action });
    return;
  }

  const headersList = await headers();
  const xff = headersList.get("x-forwarded-for");
  const ipAddress = xff?.split(",")[0]?.trim() || headersList.get("x-real-ip") || "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";
  const referer = headersList.get("referer") || undefined;

  const [isNewLocation, isNewDevice] = await Promise.all([
    isNewIPForUser(session.user.id, ipAddress),
    isNewDeviceForUser(session.user.id, userAgent),
  ]);
  const dataClassification = determineDataClassification(action, details);
  const requiresNotification = shouldNotifyUser(action);

  await withAuthDatabase(async (db) => {
    await db.collection("action_audit_logs").insertOne(withNamespaceField({
      action,
      userId: session.user.id,
      userEmail: session.user.email,
      userRole: session.user.role,
      details,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      referer,
      sessionId: session.user.id,
      isNewLocation,
      isNewDevice,
      dataClassification,
      requiresNotification,
    }));
  });

  if (shouldAlertSecurityTeam(action, details)) {
    await sendSecurityAlert({
      action,
      user: session.user,
      ipAddress,
      details,
    });
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current user without throwing (useful for optional auth)
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const session = await auth();
    return session?.user || null;
  } catch {
    return null;
  }
}

/**
 * Check if current user has a specific role
 * @returns Boolean indicating if user has the role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === role;
}

/**
 * Check if current user has any of the specified roles
 * @returns Boolean indicating if user has any of the roles
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? roles.includes(user.role) : false;
}

/**
 * Check if current user is the owner of a resource
 * @returns Boolean indicating ownership (admins always return true)
 */
export async function isOwner(resourceOwnerId: string): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) return false;
  if (user.role === "admin") return true;

  return user.id === resourceOwnerId;
}

async function isNewIPForUser(userId: string, ip: string): Promise<boolean> {
  return withAuthDatabase(async (db) => {
    const recentLogs = await db
      .collection("action_audit_logs")
      .find({ userId, ipAddress: ip, ...namespaceOrLegacyFilter() })
      .limit(1)
      .toArray();
    return recentLogs.length === 0;
  });
}

async function isNewDeviceForUser(userId: string, userAgent: string): Promise<boolean> {
  return withAuthDatabase(async (db) => {
    const recentLogs = await db
      .collection("action_audit_logs")
      .find({ userId, userAgent, ...namespaceOrLegacyFilter() })
      .limit(1)
      .toArray();
    return recentLogs.length === 0;
  });
}

function determineDataClassification(action: string, _details: Record<string, unknown>): string {
  const sensitiveActions = ["user_detail_viewed", "role_changed", "password_reset"];
  return sensitiveActions.includes(action) ? "PII" : "PUBLIC";
}

function shouldNotifyUser(action: string): boolean {
  const notifiableActions = ["role_changed", "password_changed", "email_changed"];
  return notifiableActions.includes(action);
}

function shouldAlertSecurityTeam(action: string, _details: Record<string, unknown>): boolean {
  const criticalActions = ["bulk_export", "admin_created", "permissions_elevated"];
  return criticalActions.includes(action);
}

async function sendSecurityAlert(payload: {
  action: string;
  user: { id: string; email: string; role: UserRole };
  ipAddress: string;
  details: Record<string, unknown>;
}) {
  return withAuthDatabase(async (db) => {
    await db.collection("security_alerts").insertOne(withNamespaceField({
      ...payload,
      createdAt: new Date(),
    }));
  });
}

async function logFailedAuditAttempt(action: string, error: unknown) {
  try {
    await withAuthDatabase(async (db) => {
      await db.collection("audit_log_failures").insertOne(withNamespaceField({
        action,
        error: String(error),
        createdAt: new Date(),
      }));
    });
  } catch {
  }
}

