import type { DashboardPermission, DashboardSharingRule } from "@/types/spaces";

/**
 * Permission Utilities
 *
 * Pure utility functions for permission-related operations.
 * No database operations or external dependencies.
 */

/**
 * Permission hierarchy for comparison operations.
 * Higher numbers indicate higher permissions.
 */
export const PERMISSION_LEVELS: Record<DashboardPermission, number> = {
  VIEW: 1,
  EDIT: 2,
  ADMIN: 3,
} as const;

/**
 * Get the higher of two permissions in the hierarchy.
 * Returns the permission with the highest level.
 */
export function higherPermission(a: DashboardPermission, b: DashboardPermission): DashboardPermission {
  return PERMISSION_LEVELS[a] >= PERMISSION_LEVELS[b] ? a : b;
}

/**
 * Check if a sharing rule has expired.
 * Returns true if the rule has an expiration date that is in the past.
 */
export function isRuleExpired(rule: DashboardSharingRule): boolean {
  if (!rule.expiresAt) return false;
  return new Date(rule.expiresAt) < new Date();
}

/**
 * Check if permission A is higher or equal to permission B in the hierarchy.
 */
export function hasPermissionLevel(
  userPermission: DashboardPermission,
  requiredPermission: DashboardPermission
): boolean {
  return PERMISSION_LEVELS[userPermission] >= PERMISSION_LEVELS[requiredPermission];
}

/**
 * Get all permissions that are at or above a certain level.
 * Useful for filtering or validation.
 */
export function getPermissionsAtOrAbove(level: DashboardPermission): DashboardPermission[] {
  const levelValue = PERMISSION_LEVELS[level];
  return Object.entries(PERMISSION_LEVELS)
    .filter(([_, value]) => value >= levelValue)
    .map(([permission]) => permission as DashboardPermission);
}